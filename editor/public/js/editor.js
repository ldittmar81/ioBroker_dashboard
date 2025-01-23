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
  generateFormField(key, fieldSchema, value = '') {
    const container = this.createFormFieldContainer(fieldSchema, key);


    let input;
    // Typen behandeln
    if (fieldSchema.type === 'string' && !fieldSchema.enum) {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.id = key;
      input.name = key;

      if (fieldSchema.pattern) {
        input.pattern = fieldSchema.pattern;
      }

      if (fieldSchema.maxLength) {
        input.maxLength = fieldSchema.maxLength;
      }
    }
    else if (fieldSchema.type === 'string' && fieldSchema.enum) {
      // Dropdown für enum-Werte
      input = document.createElement('select');
      fieldSchema.enum.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        opt.selected = option === value;
        input.appendChild(opt);
      });
    }
    else if (fieldSchema.type === 'boolean') {
      input = document.createElement('select');
      input.innerHTML = `
        <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ja</option>
        <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Nein</option>`;
    }
    else if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = value;
      input.id = key;
      input.name = key;

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
    }
    else if (fieldSchema.type === 'array' && fieldSchema.items?.type === 'object') {
      // Array mit Objekten als Karten
      input = this.generateObjectArrayField(key, fieldSchema, value || []);
    }
    else if (fieldSchema.type === 'array') {
      input = document.createElement('textarea');
      input.value = Array.isArray(value) ? value.join('\n') : '';
      input.id = key;
      input.name = key;
    }
    else {
      logdata(`Feldtyp "${fieldSchema.type}" wird nicht unterstützt.`);
      return null;
    }

    input.required = fieldSchema.required || false;
    container.appendChild(input);

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
