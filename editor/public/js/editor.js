const ipcRenderer = window.electronAPI;

const editorForm = document.querySelector('#editor-form');
const startPage = document.querySelector('#start-page');
const editorContainer = document.querySelector('#editor-container');

let currentDataFolder = null;

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
  generateFormField(key, fieldSchema, value = '', parentKey = '') {
    const container = this.createFormFieldContainer(fieldSchema, key);

    let input;
    const fullKey = parentKey ? `${parentKey}.${key}` : key; // Verschachtelte Schlüssel

    if (fieldSchema.type === 'string' && !fieldSchema.enum) {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.id = fullKey;
      input.name = fullKey;

      if (fieldSchema.pattern) {
        input.pattern = fieldSchema.pattern;
      }

      if (fieldSchema.maxLength) {
        input.maxLength = fieldSchema.maxLength;
      }
    } else if (fieldSchema.type === 'string' && fieldSchema.enum) {
      // Dropdown für enum-Werte
      input = document.createElement('select');
      input.name = fullKey;
      input.id = fullKey;

      fieldSchema.enum.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        opt.selected = option === value;
        input.appendChild(opt);
      });
    } else if (fieldSchema.type === 'boolean') {
      input = document.createElement('select');
      input.name = fullKey;
      input.id = fullKey;
      input.dataset.type = 'boolean'; // Typ als Hinweis speichern
      input.innerHTML = `
          <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ja</option>
          <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Nein</option>`;
    } else if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = value;
      input.id = fullKey;
      input.name = fullKey;

      if (fieldSchema.minimum !== undefined) {
        input.min = fieldSchema.minimum;
      }

      if (fieldSchema.maximum !== undefined) {
        input.max = fieldSchema.maximum;
      }

      if (fieldSchema.type === 'integer') {
        input.step = 1;
      } else if (fieldSchema.type === 'number' && fieldSchema.multipleOf) {
        input.step = fieldSchema.multipleOf;
      }
    } else if (fieldSchema.type === 'array' && fieldSchema.items?.type === 'object') {
      // Array mit Objekten
      const arrayContainer = document.createElement('div');
      arrayContainer.classList.add('array-container');
      arrayContainer.dataset.key = fullKey;

      logdata(`Array mit Objekten: ${fullKey}`);
      (value || []).forEach((item, index) => {
        const card = document.createElement('div');
        card.classList.add('array-item');
        card.dataset.index = index;
        card.classList.add('object-card');

        logdata(`Array-Item: ${fullKey}[${index}]`);
        Object.keys(fieldSchema.items.properties).forEach((subKey) => {
          const subFieldSchema = fieldSchema.items.properties[subKey];
          const subValue = item[subKey] || '';
          const subField = this.generateFormField(subKey, subFieldSchema, subValue, `${fullKey}[${index}]`);
          logdata(`Sub-Feld: ${fullKey}[${index}].${subKey}`);
          if (subField) {
            card.appendChild(subField);
          }
        });

        // Löschen-Button für die Karte
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Löschen';
        deleteButton.type = 'button';
        deleteButton.addEventListener('click', () => {
          arrayContainer.removeChild(card);
        });
        card.appendChild(deleteButton);

        arrayContainer.appendChild(card);
      });

      // Hinzufügen-Button
      const addButton = document.createElement('button');
      addButton.textContent = 'Hinzufügen';
      addButton.type = 'button';
      addButton.addEventListener('click', () => {
        const newItem = {};
        Object.keys(fieldSchema.items.properties).forEach((subKey) => {
          newItem[subKey] = fieldSchema.items.properties[subKey].default || '';
        });
        value.push(newItem);
        this.generateFormField(key, fieldSchema, value, parentKey); // Neu rendern
      });

      arrayContainer.appendChild(addButton);
      container.appendChild(arrayContainer);
    } else if (fieldSchema.type === 'array') {
      input = document.createElement('textarea');
      input.value = Array.isArray(value) ? value.join('\n') : '';
      input.id = fullKey;
      input.name = fullKey;
    } else {
      logdata(`Feldtyp "${fieldSchema.type}" wird nicht unterstützt.`);
      return null;
    }

    if (input) {
      input.required = fieldSchema.required || false;
      container.appendChild(input);
    }

    return container;
  },

  generateObjectArrayField(key, fieldSchema, valueArray) {
    const container = document.createElement('div');
    container.classList.add('array-container');
    const label = document.createElement('h4');
    label.textContent = fieldSchema.description || key;
    container.appendChild(label);

    const cardsContainer = document.createElement('div');
    cardsContainer.classList.add('cards-container');
    container.appendChild(cardsContainer);

    // Karten für jedes Objekt im Array erstellen
    valueArray.forEach((item, index) => {
      const card = this.generateObjectCard(`${key}[${index}]`, fieldSchema.items, item, () => {
        // Löschfunktion
        valueArray.splice(index, 1);
        this.generateObjectArrayField(key, fieldSchema, valueArray); // Neu rendern
      });
      cardsContainer.appendChild(card);
    });

    // Button zum Hinzufügen eines neuen Objekts
    const addButton = document.createElement('button');
    addButton.textContent = `Neues ${key} hinzufügen`;
    addButton.type = 'button';
    addButton.addEventListener('click', () => {
      const newItem = {}; // Leeres Objekt für das neue Item
      valueArray.push(newItem);
      this.generateObjectArrayField(key, fieldSchema, valueArray); // Neu rendern
    });
    container.appendChild(addButton);

    return container;
  },

  generateObjectCard(key, schema, value, onDelete) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.style.border = '1px solid #ccc';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';
    card.style.backgroundColor = '#aaa';

    Object.keys(schema.properties).forEach((subKey) => {
      const subSchema = schema.properties[subKey];
      const subValue = value[subKey] || subSchema.default || '';
      const field = this.generateFormField(`${key}.${subKey}`, subSchema, subValue);
      if (field) {
        field.addEventListener('input', (event) => {
          value[subKey] = event.target.value;
        });
        card.appendChild(field);
      }
    });

    // Button zum Löschen der Karte
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Löschen';
    deleteButton.type = 'button';
    deleteButton.style.marginTop = '10px';
    deleteButton.addEventListener('click', onDelete);
    card.appendChild(deleteButton);

    return card;
  },

  saveData(content, filePath) {
    const formContainer = document.querySelector('#editor-form');
    const inputs = formContainer.querySelectorAll('input, select, textarea');

    // Hilfsfunktion, um verschachtelte Objekte zu erstellen
    const setNestedValue = (obj, path, value) => {
      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      keys.reduce((acc, key, index) => {
        if (index === keys.length - 1) {
          if (value !== '' && value !== null && value !== undefined) acc[key] = value;
        } else {
          if (!acc[key]) acc[key] = isNaN(keys[index + 1]) ? {} : [];
          return acc[key];
        }
      }, obj);
    };

    const updatedContent = { ...content };

    inputs.forEach((input) => {
      logdata(`Speichern von ${input.name || input.id}`);
      const key = input.name || input.id;
      let value;

      // Typ erkennen und Wert korrekt interpretieren
      if (input.dataset.type === 'boolean') {
        value = input.value === 'true';
      }
      else if (input.type === 'number') {
        value = input.value !== '' ? Number(input.value) : undefined;
      }
      else if (input.tagName === 'TEXTAREA' && Array.isArray(content[key])) {
        value = input.value.split('\n').map((item) => item.trim()).filter((item) => item !== '');
      }
      else if (input.dataset.type === 'json') {
        value = JSON.parse(input.value);
      }
      else {
        value = input.value;
      }

      logdata(`Wert: ${value}`);

      // Verschachtelte Objekte/Arrays verarbeiten
      setNestedValue(updatedContent, key, value);
    });

    const cleanContent = this.cleanObject(updatedContent);

    ipcRenderer
      .invoke('write-file', { filePath, content: JSON.stringify(cleanContent, null, 2) })
      .then(() => {
        modalJS.showModal('Daten erfolgreich gespeichert.');
        this.showStartPage();
      })
      .catch((error) => {
        logdata(`Fehler beim Speichern: ${error.message}`, 'error');
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

ipcRenderer.on('edit-theme', ({ user, themePath }) => {
  logdata(`Lade Theme-Editor für Benutzer "${user.name}" mit Pfad: ${themePath}`);
  themeJS.showThemeForm(themePath);
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
  sidebarJS.showSidebarForm(content, schema);
});

// Zeige Startseite beim Start
editorJS.showStartPage();
