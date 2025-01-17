const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

