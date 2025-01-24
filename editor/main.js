const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let selectedEnvironment = null;
let users = [];
let currentConfig = null;
let currentFolder = null;

const excludedFolders = ['.idea', '.git', 'assets', 'dist', 'doc', 'editor', 'node_modules', 'schema', 'data', 'private'];

function setEnvironment(env) {
  selectedEnvironment = env;
  createMenu(); // Menü neu erstellen
  mainWindow.webContents.send('environment-changed', env); // Renderer informieren
}

function loadUsers(dataFolder) {
  console.log('Benutzer laden...');

  const usersPath = path.join(dataFolder, 'users.json');

  if (!fs.existsSync(usersPath)) {
    console.log('users.json nicht gefunden. Erstelle leere Datei.');
    fs.writeFileSync(usersPath, '[]', 'utf8');
  }

  try {
    const usersData = fs.readFileSync(usersPath, 'utf8');
    users = JSON.parse(usersData);
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
  console.log('Create Menu...');
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
    // Anwender Menü
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

    // Theme Menü
    const themeMenu = {
      label: 'Theme',
      submenu: [
        {
          label: 'Standard',
          click: () => {
            console.log('Theme: Standard wurde geklickt'); // Debug-Log
            openSection('Theme');
          },
        },
        ...users
          .map(user => ({
            label: user.name,
            click: () => {
              console.log(`Theme für Benutzer "${user.name}" ausgewählt.`);
              // Überprüfen und ggf. default.css kopieren
              const userThemePath = path.join(__dirname, '..', currentFolder, 'theme', `${user.user}.css`);
              const defaultThemePath = path.join(__dirname, '..', 'assets', 'css', 'users', 'default.css');

              if (!fs.existsSync(userThemePath)) {
                console.log(`Theme für Benutzer "${user.name}" fehlt. Kopiere Standard-Theme...`);
                try {
                  fs.copyFileSync(defaultThemePath, userThemePath);
                  console.log(`Standard-Theme für Benutzer "${user.name}" erfolgreich kopiert.`);
                } catch (error) {
                  console.error(`Fehler beim Kopieren des Standard-Themes für Benutzer "${user.name}":`, error);
                  return;
                }
              }

              // Editor-Befehl an Renderer-Prozess senden
              mainWindow.webContents.send('edit-theme', userThemePath);
            },
          })),
      ],
    };
    additionalMenus.push(themeMenu);

    // Seitenfenster Menü
    const sidebarMenu = {
      label: 'Seitenfenster',
      submenu: [
        {
          label: 'Standard',
          click: openSidebarConfig,
        },
        ...users
          .filter(user => fs.existsSync(path.join(__dirname, '..', currentFolder, `sidebar_${user.user}.json`)))
          .map(user => ({
            label: user.name,
            click: () => {
              console.log(`Seitenfenster für Benutzer "${user.name}" ausgewählt.`);
              mainWindow.webContents.send('edit-sidebar', user);
            },
          })),
      ],
    };
    additionalMenus.push(sidebarMenu);

    // Übersichtsfenster Menü
    const overviewMenu = {
      label: 'Übersichtsfenster',
      submenu: [
        {
          label: 'Standard',
          click: () => openSection('Übersichtsfenster'),
        },
        ...users
          .filter(user => fs.existsSync(path.join(__dirname, '..', currentFolder, `overview_${user.user}.json`)))
          .map(user => ({
            label: user.name,
            click: () => {
              console.log(`Übersichtsfenster für Benutzer "${user.name}" ausgewählt.`);
              mainWindow.webContents.send('edit-overview', user);
            },
          })),
      ],
    };
    additionalMenus.push(overviewMenu);

    const navigationMenu = {
      label: 'Navigationsmenü',
      submenu: [],
    };

    if (currentConfig && currentConfig.pages && Array.isArray(currentConfig.pages)) {
      currentConfig.pages.forEach(page => {
        const pageName = path.basename(page, '.json');
        const pagePath = path.join(__dirname, '..', currentFolder, 'main', page);

        // Datei prüfen und ggf. erstellen
        if (!fs.existsSync(pagePath)) {
          const defaultContent = {
            name: pageName,
            type: pageName,
            icon: 'fa-question',
            content: [],
          };

          try {
            fs.writeFileSync(pagePath, JSON.stringify(defaultContent, null, 2), 'utf8');
            console.log(`Standarddatei für ${pageName} erstellt.`);
          } catch (error) {
            console.error(`Fehler beim Erstellen der Standarddatei für ${pageName}:`, error);
          }
        }

        // Dateiinhalt laden, um den Namen zu holen
        let pageLabel = pageName;
        try {
          const pageData = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
          if (pageData.name) {
            pageLabel = pageData.name;
          }
        } catch (error) {
          console.error(`Fehler beim Lesen der Datei ${pagePath}:`, error);
        }

        // Menüeintrag hinzufügen
        navigationMenu.submenu.push({
          label: pageLabel,
          click: () => {
            console.log(`Navigationsseite "${pageLabel}" ausgewählt.`);
            mainWindow.webContents.send('edit-page', { pageName, pagePath });
          },
        });
      });

      const demoPage = 'demo.json';
      const demoPath = path.join(__dirname, '..', currentFolder, 'main', demoPage);

      if (!currentConfig.pages.includes(demoPage)) {
        if (fs.existsSync(demoPath)) {
          // Dateiinhalt laden, um den Namen zu holen
          let demoLabel = 'Demo';
          try {
            const demoData = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
            if (demoData.name) {
              demoLabel = demoData.name;
            }
          } catch (error) {
            console.error(`Fehler beim Lesen der Datei ${demoPath}:`, error);
          }

          // Menüeintrag für demo.json hinzufügen
          navigationMenu.submenu.push({
            label: demoLabel,
            click: () => {
              console.log(`Navigationsseite "${demoLabel}" ausgewählt.`);
              mainWindow.webContents.send('edit-page', { pageName: 'demo', pagePath: demoPath });
            },
          });
        }
      }
    }

    additionalMenus.push(navigationMenu);

    additionalMenus.push({
      label: 'Weitere',
      submenu: [
        {
          label: 'Medienliste',
          click: () => openSection('Medienliste'),
        }
      ],
    });

    // Deployment Konfiguration nur für Produktiv
    if (selectedEnvironment === 'Produktiv') {
      additionalMenus.push({
        label: 'Deployment Konfiguration',
        click: () => openSection('Deployment Konfiguration'),
      });
    }
  }
  const menuTemplate = [environmentMenu, ...additionalMenus];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  console.log("Menu erstellt.")
}

function openSection(section) {
  console.log(`Section geöffnet: ${section}`);
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
    width: 1200,
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
  console.log(`Lade Konfigurationsdatei: ${fileName}`);
  const filePath = path.join(__dirname, '..', fileName);
  const schemaPath = path.join(__dirname, '..', 'schema', 'config.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  console.log("File path: ", filePath);
  console.log("Schema path: ", schemaPath);

  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(fileData);

    currentConfig = config;
    currentFolder = config.dataFolder;

    loadUsers(path.join(__dirname, '..', currentFolder));
    createMenu();

    console.log("Config: ", config);
    mainWindow.webContents.send('load-config', { fileName, schema, content: config });
    console.log("Gesendet an Renderer-Seite.");
  }
  else {
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

function openSidebarConfig() {
  const sidebarPath = path.join(__dirname, '..', currentFolder, 'sidebar.json');
  const schemaPath = path.join(__dirname, '..', 'schema', 'sidebar.schema.json');

  // Lade das Schema
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  if (!fs.existsSync(sidebarPath)) {
    console.log('sidebar.json nicht gefunden. Erstelle eine neue Datei...');
    // Erstelle eine leere Standarddatei basierend auf dem Schema
    const defaultSidebarConfig = {
      clock: schema.properties.clock.default || 'default',
      openWeatherMap: schema.properties.openWeatherMap.default || {},
      ioBroker_ical: schema.properties.ioBroker_ical.default || {},
    };

    fs.writeFileSync(sidebarPath, JSON.stringify(defaultSidebarConfig, null, 2), 'utf8');
    console.log('sidebar.json erfolgreich erstellt.');
  }

  // Lade die bestehende oder erstellte Datei
  const sidebarContent = JSON.parse(fs.readFileSync(sidebarPath, 'utf8'));
  console.log('sidebar.json geladen:');

  // Sende die Datei an den Renderer-Prozess
  mainWindow.webContents.send('edit-sidebar', { path: sidebarPath, content: sidebarContent, schema });
}


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('save-config', (event, { fileName, content }) => {
  const filePath = path.join(__dirname, '..', fileName);
  console.log(`Speichere Datei: ${filePath}`); // Debug-Ausgabe für den Pfad

  try {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`Änderungen in ${fileName} gespeichert.`);
    currentFolder = content.dataFolder;
    currentConfig = content;
    loadUsers(path.join(__dirname, '..', currentFolder));
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
  const dataFolder = path.join(__dirname, '..', currentFolder);

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
  if (!currentConfig || !currentFolder) {
    throw new Error('dataFolder ist in der Konfiguration nicht definiert.');
  }

  const dataFolder = path.join(__dirname, '..', currentFolder);
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

ipcMain.handle('check-file-existence', async (event, filePath) => {
  console.log('Check file existence:', filePath);
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
});

ipcMain.handle('copy-file', async (event, { source, destination }) => {
  const fullSourcePath = path.join(__dirname, '..', source);
  const fullDestinationPath = path.join(__dirname, '..', destination);

  try {
    if (!fs.existsSync(path.dirname(fullDestinationPath))) {
      fs.mkdirSync(path.dirname(fullDestinationPath), { recursive: true });
    }
    fs.copyFileSync(fullSourcePath, fullDestinationPath);
    console.log(`Datei kopiert: ${fullSourcePath} -> ${fullDestinationPath}`);
    return true;
  } catch (error) {
    console.error(`Fehler beim Kopieren der Datei: ${error.message}`);
    throw error;
  }
});

ipcMain.handle('get-config', async () => {
  return currentConfig;
});

ipcMain.handle('read-file', (event, filePath) => {
  const resolvedPath = path.resolve(__dirname, '..', filePath);
  console.log('read-file: ' + resolvedPath);

  return fs.promises.readFile(resolvedPath, 'utf8').catch(error => {
    console.error(`Error occurred while reading file "${resolvedPath}":`, error);
    throw error;
  });
});

ipcMain.handle('write-file', (event, { filePath, content }) => {
  const resolvedPath = path.resolve(__dirname, '..', filePath);
  console.log('write-file: ' + resolvedPath);

  return fs.promises.writeFile(resolvedPath, content, 'utf8').catch(error => {
    console.error(`Error occurred while writing to file "${resolvedPath}":`, error);
    throw error;
  });
});
