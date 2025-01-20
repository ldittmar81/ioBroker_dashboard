const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let selectedEnvironment = null;
let users = [];
let currentConfig = null;

const excludedFolders = ['.idea', '.git', 'assets', 'dist', 'doc', 'editor', 'node_modules', 'schema', 'data', 'private'];

function setEnvironment(env) {
  selectedEnvironment = env;
  createMenu(); // Menü neu erstellen
  mainWindow.webContents.send('environment-changed', env); // Renderer informieren
}

function loadUsers(dataFolder) {
  const usersPath = path.join(dataFolder, 'users.json');

  if (!fs.existsSync(usersPath)) {
    console.log('users.json nicht gefunden. Erstelle leere Datei.');
    fs.writeFileSync(usersPath, '[]', 'utf8');
  }

  try {
    const usersData = fs.readFileSync(usersPath, 'utf8');
    users = JSON.parse(usersData);
    console.log('Benutzer geladen:', users);
  } catch (error) {
    console.error('Fehler beim Laden der users.json:', error);
    users = [];
  }
}

function saveUsers(dataFolder) {
  const usersPath = path.join(dataFolder, 'users.json');

  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
    console.log('Benutzer gespeichert.');

    // Benutzerliste neu laden und Menü aktualisieren
    loadUsers(dataFolder);
    createMenu();
  } catch (error) {
    console.error('Fehler beim Speichern der users.json:', error);
  }
}


function createMenu() {
  const environmentMenu = {
    label: 'Umgebung',
    submenu: [
      {
        label: 'Entwicklung',
        type: 'checkbox',
        checked: selectedEnvironment === 'Entwicklung',
        click: () => {
          setEnvironment('Entwicklung');
          loadConfigFile('config.json');
        },
      },
      {
        label: 'Produktiv',
        type: 'checkbox',
        checked: selectedEnvironment === 'Produktiv',
        click: () => {
          setEnvironment('Produktiv');
          loadConfigFile('config_prod.json');
        },
      },
    ],
  };

  const additionalMenus = [];
  if (selectedEnvironment) {
    additionalMenus.push({
      label: 'Anwender',
      submenu: [
        ...users.map(user => ({
          label: user.name,
          click: () => {
            console.log(`Benutzer "${user.name}" ausgewählt.`);
            mainWindow.webContents.send('edit-user', user); // Nachricht an Renderer-Prozess senden
          },
        })),
        {
          label: 'Neuer Anwender anlegen',
          click: () => {
            mainWindow.webContents.send('new-user'); // Nachricht an Renderer-Prozess senden
          },
        },
      ],
    });

    additionalMenus.push({
      label: 'Seitenfenster',
      click: () => openSection('Seitenfenster'),
    });

    additionalMenus.push({
      label: 'Übersichtsfenster',
      click: () => openSection('Übersichtsfenster'),
    });

    additionalMenus.push({
      label: 'Navigationsmenü',
      click: () => openSection('Navigationsmenü'),
    });

    if (selectedEnvironment === 'Produktiv') {
      additionalMenus.push({
        label: 'Deployment Konfiguration',
        click: () => openSection('Deployment Konfiguration'),
      });
    }
  }

  const menuTemplate = [
    environmentMenu,
    ...additionalMenus,
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

function openSection(section) {
  mainWindow.webContents.send('open-section', section);
}

// Funktion zur Sicherstellung der gesamten Ordnerstruktur
function ensureFolderStructureExists(baseFolder) {
  const subFolders = [
    'devices',
    'helpers/mediaChannelLists',
    'img/devices',
    'img/main',
    'img/users',
    'main',
    'theme',
  ];

  subFolders.forEach((subFolder) => {
    const folderPath = path.join(baseFolder, subFolder);
    if (!fs.existsSync(folderPath)) {
      console.log(`Erstelle Unterordner: ${folderPath}`);
      try {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`Unterordner "${subFolder}" wurde erfolgreich erstellt.`);
      } catch (error) {
        console.error(`Fehler beim Erstellen des Unterordners "${subFolder}":`, error);
      }
    } else {
      console.log(`Unterordner "${subFolder}" existiert bereits.`);
    }
  });
}

// Überprüfen und Erstellen des privaten Ordners
function ensurePrivateFolderExists() {
  const privateFolderPath = path.join(__dirname, '..', 'private');
  if (!fs.existsSync(privateFolderPath)) {
    console.log('Der Ordner "private" existiert nicht. Erstelle den Ordner...');
    try {
      fs.mkdirSync(privateFolderPath, { recursive: true });
      console.log('Ordner "private" wurde erfolgreich erstellt.');
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners "private":', error);
    }
  } else {
    console.log('Der Ordner "private" existiert bereits.');
  }

  // Unterstruktur im "private"-Ordner sicherstellen
  ensureFolderStructureExists(privateFolderPath);
}

app.on('ready', () => {
  ensurePrivateFolderExists();

  mainWindow = new BrowserWindow({
    width: 800,
    height: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('./public/index.html');

  createMenu(); // Initiales Menü erstellen
});

// Funktion zum Laden der Konfigurationsdatei und Senden an die Renderer-Seite
function loadConfigFile(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  const schemaPath = path.join(__dirname, '..', 'schema', 'config.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(fileData);

    currentConfig = config;

    loadUsers(path.join(__dirname, '..', config.dataFolder));
    createMenu();
    mainWindow.webContents.send('load-config', { fileName, schema, content: config });
  } else {
    console.log(`Datei ${fileName} nicht gefunden. Erstelle Standardkonfiguration...`);

    // Standardwerte für die Konfiguration
    const defaultConfig = {
      connLink: 'http://192.168.x.xx:8089',
      console: false,
      pages: ['rooms.json', 'functions.json', 'informations.json'],
      mode: fileName === 'config_prod.json' ? 'live' : 'demo',
      dataFolder: fileName === 'config_prod.json' ? 'private' : 'data',
    };

    // Speichere die Standardkonfiguration in die Datei
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      console.log(`Standardkonfiguration in ${fileName} erstellt.`);
      loadUsers(path.join(__dirname, '..', defaultConfig.dataFolder)); // Benutzer laden
      createMenu(); // Menü aktualisieren
      mainWindow.webContents.send('load-config', { fileName, schema, content: defaultConfig });
    } catch (error) {
      console.error(`Fehler beim Erstellen der Standardkonfiguration für ${fileName}:`, error);
    }
  }
}


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('save-config', (event, { fileName, content }) => {
  const filePath = path.join(__dirname, '..', fileName);
  console.log(`Speichere Datei: ${filePath}`); // Debug-Ausgabe für den Pfad
  console.log('Inhalt:', content); // Debug-Ausgabe für den Inhalt

  try {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`Änderungen in ${fileName} gespeichert.`);
    loadUsers(path.join(__dirname, '..', content.dataFolder));
    createMenu();
  } catch (error) {
    console.error(`Fehler beim Speichern der Datei ${fileName}:`, error);
  }
});

ipcMain.on('log-message', (event, message) => {
  console.log(`[Renderer-Log]: ${message}`);
});

// IPC für das Abrufen der Root-Ordner
ipcMain.handle('get-root-folders', async () => {
  const rootPath = path.join(__dirname, '..');
  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && !excludedFolders.includes(dirent.name))
    .map((dirent) => dirent.name);
});

// IPC für das Erstellen eines neuen Ordners
ipcMain.handle('create-folder', async (event, folderName) => {
  const folderPath = path.join(__dirname, '..', folderName);
  const gitIgnorePath = path.join(__dirname, '..', '.gitignore');

  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      console.log(`Ordner '${folderName}' erstellt.`);

      ensureFolderStructureExists(folderPath);
    }

    // Zur .gitignore hinzufügen
    const gitIgnoreContent = fs.existsSync(gitIgnorePath)
      ? fs.readFileSync(gitIgnorePath, 'utf8')
      : '';
    if (!gitIgnoreContent.includes(folderName)) {
      fs.appendFileSync(gitIgnorePath, `\n${folderName}`);
      console.log(`Ordner '${folderName}' zur .gitignore hinzugefügt.`);
    }

    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen des Ordners:', error);
    return false;
  }
});

ipcMain.handle('validate-page-name', async (event, pageName) => {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const pagePattern = schema.properties.pages.items.pattern;

  return new RegExp(pagePattern).test(pageName);
});

ipcMain.handle('save-user', async (event, { newUser, existingUserId }) => {
  const dataFolder = path.join(__dirname, '..', selectedEnvironment === 'Produktiv' ? 'private' : 'data');

  // Prüfen, ob es sich um einen neuen oder bestehenden Anwender handelt
  if (existingUserId) {
    const index = users.findIndex(user => user.user === existingUserId);
    if (index !== -1) {
      users[index] = newUser;
    }
  } else {
    users.push(newUser);
  }

  saveUsers(dataFolder);
  return true;
});

ipcMain.handle('upload-icon', async (event, filePath) => {
  if (!currentConfig || !currentConfig.dataFolder) {
    throw new Error('dataFolder ist in der Konfiguration nicht definiert.');
  }

  const dataFolder = path.join(__dirname, '..', currentConfig.dataFolder);
  const userImgFolder = path.join(dataFolder, 'img', 'users');

  // Ziel-Pattern (Beispiel)
  const schemaPattern = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|svg|gif|webp)$/;

  // Ursprünglicher Dateiname und Anpassung
  let originalName = path.basename(filePath);
  const extension = originalName.split('.').pop();
  let baseName = originalName.split('.').slice(0, -1).join('_').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Optional: Länge des Basenamens beschränken
  baseName = baseName.substring(0, 20);

  let newFileName = `${baseName}.${extension}`;

  // Validieren und ggf. korrigieren
  if (!schemaPattern.test(newFileName)) {
    newFileName = `${baseName}_fixed.${extension}`;
  }

  // Speicherpfad erstellen
  const destPath = path.join(userImgFolder, newFileName);

  // Sicherstellen, dass der Zielordner existiert
  if (!fs.existsSync(userImgFolder)) {
    fs.mkdirSync(userImgFolder, { recursive: true });
  }

  // Datei speichern
  fs.copyFileSync(filePath, destPath);

  // Rückgabe des neuen Dateinamens
  return newFileName;
});

ipcMain.handle('get-schema', async (event, schemaName) => {
  const schemaPath = path.join(__dirname, '..', 'schema', schemaName);
  if (fs.existsSync(schemaPath)) {
    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      return JSON.parse(schema);
    } catch (error) {
      console.error(`Fehler beim Laden des Schemas "${schemaName}":`, error);
      throw new Error(`Schema "${schemaName}" konnte nicht geladen werden.`);
    }
  } else {
    console.error(`Schema "${schemaName}" wurde nicht gefunden.`);
    throw new Error(`Schema "${schemaName}" existiert nicht.`);
  }
});



