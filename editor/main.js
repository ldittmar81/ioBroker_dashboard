const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const excludedFolders = ['.idea', '.git', 'assets', 'dist', 'doc', 'editor', 'node_modules', 'schema', 'data', 'private'];
let mainWindow;

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

  const menu = Menu.buildFromTemplate([
    {
      label: 'Datei',
      submenu: [
        {
          label: 'Konfiguration',
          submenu: [
            {
              label: 'Entwicklung (config.json)',
              click: () => {
                loadConfigFile('config.json');
              },
            },
            {
              label: 'Produktiv (config_prod.json)',
              click: () => {
                loadConfigFile('config_prod.json');
              },
            },
          ],
        },
        { role: 'quit' },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
});

const schemaPath = path.join(__dirname, '..', 'schema', 'config.schema.json');

// Funktion zum Laden der Konfigurationsdatei und Senden an die Renderer-Seite
function loadConfigFile(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath, 'utf8');
    mainWindow.webContents.send('load-config', { fileName, schema, content: JSON.parse(fileData) });
  } else {
    console.error(`Datei ${fileName} nicht gefunden.`);
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
