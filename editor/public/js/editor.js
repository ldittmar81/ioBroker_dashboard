const ipcRenderer = window.electronAPI;

const editorForm = document.querySelector('#editor-form');
const startPage = document.querySelector('#start-page');
const editorContainer = document.querySelector('#editor-container');

let cachedIoBrokerIDs = null;
let currentDataFolder = null;
let reloadMenu = false;
let availableFAIcons = [];

function logdata(message, type = 'info') {
  type = type.toUpperCase();
  ipcRenderer.send('log-message', `*${type}* ${message}`);
}

const editorJS = {
  showStartPage() {
    startPage.classList.remove('hidden');
    editorContainer.classList.add('hidden');
  },
  showEditor() {
    startPage.classList.add('hidden');
    editorContainer.classList.remove('hidden');
  },
  updateHiddenInput(hiddenInput, pagesArray) {
    hiddenInput.value = JSON.stringify(pagesArray);
  },
  isHexColor(str) {
    return /^#[A-Fa-f0-9]{6}$/.test(str);
  },
  createFormFieldContainer(schema, key) {
    const container = document.createElement('div');
    container.classList.add('form-field');

    const label = document.createElement('label');
    label.textContent = schema?.description;
    label.htmlFor = key;

    const requiredSpan = document.createElement('span');
    if (schema?.items?.required?.includes(key)) {
      requiredSpan.textContent = ' *';
      requiredSpan.classList.add('required-star');
    }
    label.appendChild(requiredSpan);
    container.appendChild(label);

    return container;
  },

  loadFAIcons() {
    return fetch('../../assets/vendor/fontawesome/css/all.min.css')
      .then(response => response.text())
      .then(cssContent => {
        // Neuer Regex: Kein \s*\{ am Ende mehr!
        const regex = /\.fa-([a-zA-Z0-9-]+):before/g;

        const icons = [];
        let match;
        while ((match = regex.exec(cssContent)) !== null) {
          icons.push(`fa-${match[1]}`);
        }

        // Duplikate entfernen & sortieren
        availableFAIcons = [...new Set(icons)].sort((a, b) => a.localeCompare(b));

        logdata('FontAwesome Icons geladen: ' + availableFAIcons.length);
        return availableFAIcons;
      })
      .catch(err => {
        logdata('Fehler beim Laden/Parsen von all.min.css:' + err, 'error');
        availableFAIcons = [];
        return [];
      });
  },

  generateFormField(type = '', subtype = '', key, fieldSchema, value = '', parentKey = '', deep = 0) {

    const container = this.createFormFieldContainer(fieldSchema, key);
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (key === 'authorization' || key === 'authorization_read') {
      formFieldsJS.createAuthorizationField(fullKey, value, container);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^\\d{4}$') {
      formFieldsJS.createPinField(value, fullKey, fieldSchema, container);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|svg|gif|webp)$') {
      formFieldsJS.createImageUploadField(fullKey, value, fieldSchema, subtype, container);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^fa[a-zA-Z-]*$') {
      formFieldsJS.createIconSelectField(value, fullKey, container);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^#([A-Fa-f0-9]{6})$') {
      formFieldsJS.createColorPickerField(fullKey, value, fieldSchema, container);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^[a-zA-Z0-9_-äöüÄÖÜß]+\\.\\d+\\.[a-zA-Z0-9._-äöüÄÖÜß]+$') {
      formFieldsJS.createIoBrokerIDField(value, fullKey, fieldSchema, container);
    }
    else if (fieldSchema.type === 'string' && !fieldSchema.enum) {
      formFieldsJS.createInputTextField(value, fullKey, fieldSchema, container);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.enum) {
      formFieldsJS.createEnumSelectorField(fullKey, fieldSchema, value, container);
    }
    else if (fieldSchema.type === 'boolean') {
      formFieldsJS.createBooleanField(fullKey, value, fieldSchema, container);
    }
    else if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
      formFieldsJS.createNumberField(value, fullKey, fieldSchema, container);
    }
    else if (fieldSchema.type === 'array' && fieldSchema.items?.type === 'object') {
      formFieldsJS.createObjectCard(deep, fullKey, value, fieldSchema, type, subtype, container);
    }
    else if (fieldSchema.type === 'array') {
      formFieldsJS.createArrayField(value, fullKey, fieldSchema, container);
    }
    else {
      logdata(`Feldtyp "${fieldSchema.type}" wird nicht unterstützt.`);
      return null;
    }

    return container;
  },

  saveData(content, filePath) {
    const formContainer = document.querySelector('#editor-form');
    const inputs = formContainer.querySelectorAll('input, select, textarea');

    // Hilfsfunktion, um verschachtelte Objekte zu erstellen
    const setNestedValue = (obj, path, value) => {
      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      keys.reduce((acc, key, index) => {
        if (index === keys.length - 1) {
          if (value !== '' && value !== null && value !== undefined) {
            acc[key] = value;
          }
        } else {
          if (!acc[key]) acc[key] = isNaN(keys[index + 1]) ? {} : [];
          return acc[key];
        }
      }, obj);
    };

    const updatedContent = { ...content };

    inputs.forEach((input) => {
      const key = input.name || input.id;
      let value;

      const fieldType = input.dataset.type;

      // Typ erkennen und Wert korrekt interpretieren
      if (fieldType === 'boolean') {
        if (input.value === '') {
          value = undefined;
        } else {
          value = input.value === 'true';
        }
      }
      else if (fieldType === 'integer') {
        if (input.value === '') {
          value = undefined;
        } else {
          value = parseInt(input.value, 10);
          if (isNaN(value)) value = undefined;
        }
      }
      else if (input.type === 'number') {
        value = input.value !== '' ? Number(input.value) : undefined;
      }
      else if (input.tagName === 'TEXTAREA' && Array.isArray(content[key])) {
        if (input.value === '') value = undefined;
        else value = input.value.split('\n').map((item) => item.trim()).filter((item) => item !== '');
      }
      else if (fieldType === 'json') {
        if (input.value === '[]') value = undefined;
        else value = JSON.parse(input.value);
      }
      else {
        logdata(input.value + " bha!");
        if (input.value === '' || input.value === null || input.value === undefined) value = undefined;
        else value = input.value;
      }

      // Verschachtelte Objekte/Arrays verarbeiten
      setNestedValue(updatedContent, key, value);
    });

    const cleanContent = this.cleanObject(updatedContent);

    ipcRenderer
      .invoke('write-file', { filePath, content: JSON.stringify(cleanContent, null, 2), reload: reloadMenu })
      .then(() => {
        modalJS.showModal('Daten erfolgreich gespeichert.');
        reloadMenu = false;
        this.showStartPage();
      })
      .catch((error) => {
        logdata(`Fehler beim Speichern: ${error.message}`, 'error');
        reloadMenu = false;
      });
  },

  cleanObject(obj) {
    if (Array.isArray(obj)) {
      // Arrays: Leere Elemente entfernen
      return obj
        .map((item) => this.cleanObject(item))
        .filter((item) => item !== null && item !== undefined && Object.keys(item).length > 0);
    } else if (typeof obj === 'object' && obj !== null) {
      // Objekte: Leere Schlüssel entfernen
      return Object.keys(obj).reduce((acc, key) => {
        const value = this.cleanObject(obj[key]);
        if (
          value !== null &&
          value !== undefined &&
          !(typeof value === 'string' && value === '') &&
          !(typeof value === 'number' && isNaN(value))
        ) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }
    return obj;
  },
  createHeader(text) {
    // Überschrift hinzufügen
    const header = document.createElement('h3');
    header.textContent = text;
    return header;
  },
  createButtons(onSaveCallback) {
    // Speichern- und Abbrechen-Buttons
    const actions = document.createElement('div');
    actions.classList.add('actions');

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Speichern';
    saveBtn.type = 'button';

    if (onSaveCallback && typeof onSaveCallback === 'function') {
      saveBtn.addEventListener('click', onSaveCallback); // Save-Callback registrieren
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', this.showStartPage);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    return actions;
  },
  generateCardHeader(text) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.style.border = '1px solid #ccc';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';

    const cardHeader = document.createElement('h4');
    cardHeader.textContent = text;
    card.appendChild(cardHeader);

    return card;
  },
  loadIoBrokerIDs() {
    return new Promise((resolve, reject) => {
      if (cachedIoBrokerIDs) {
        resolve(cachedIoBrokerIDs); // IDs aus dem Cache zurückgeben
      } else {
        ipcRenderer.invoke('read-file', `${currentDataFolder}/ioBroker_IDs.json`)
          .then((data) => {
            cachedIoBrokerIDs = JSON.parse(data); // IDs zwischenspeichern
            resolve(cachedIoBrokerIDs);
          })
          .catch((error) => {
            logdata('Fehler beim Laden der ioBroker-IDs: ' + error, 'error');
            reject(error);
          });
      }
    });
  },
  resetIoBrokerIDCache() {
    cachedIoBrokerIDs = null;
  }
}

window.onerror = function (message, source, lineno, colno, error) {
  logdata(`${message} at ${source}:${lineno}:${colno}`, 'UNCAUGHT ERROR');
  if (error) {
    logdata(error.stack, 'UNCAUGHT ERROR');
  }
};

window.addEventListener('unhandledrejection', (event) => {
  logdata(event.reason, 'UNHANDLED PROMISE REJECTION');
});

ipcRenderer.on('load-config', ({ fileName, schema, content }) => {
  currentDataFolder = content.dataFolder;
  configJS.currentFile = fileName;
  configJS.createFormFromSchema(schema, content);
});

ipcRenderer.on('new-user', () => {
  usersJS.showUserForm(); // Leeres Formular anzeigen
});

ipcRenderer.on('edit-user', (user) => {
  usersJS.showUserForm(user); // Formular mit Benutzerinformationen anzeigen
});

ipcRenderer.on('edit-theme', (themePath) => {
  themeJS.showThemeForm(themePath);
});

ipcRenderer.on('edit-page', ({ pageName, pagePath }) => {
  logdata(`Lade Navigation-Konfiguration: ${pageName}`);
  ipcRenderer.invoke('get-schema', 'main.schema.json')
    .then((schema) => {
      return ipcRenderer.invoke('read-file', pagePath)
        .then((fileContent) => {
          const content = JSON.parse(fileContent);
          pagesJS.showMainPage(content, schema, pagePath);
        });
    })
    .catch((err) => {
      console.error('Fehler beim Laden der Seite oder des Schemas:', err);
    });
});

ipcRenderer.on('open-section', (section) => {
  switch (section) {
    case 'Seitenfenster':
      logdata('Seitenfenster-Sektion wird geladen.');
      break;
    case 'Theme':
      logdata('Theme-Sektion wird geladen.');
      themeJS.checkAndCopyDefaultTheme();
      logdata('Theme-Sektion fertig.');
      break;
    default:
      this.logdata(`Unbekannte Sektion: ${section}`);
  }
});

ipcRenderer.on('edit-sidebar', ({ path, content, schema }) => {
  logdata(`Lade Seitenfenster-Konfiguration von: ${path}`);
  sidebarJS.showSidebarForm(content, schema, path.split('/').pop());
});

editorJS.loadFAIcons().then(() => editorJS.showStartPage());

