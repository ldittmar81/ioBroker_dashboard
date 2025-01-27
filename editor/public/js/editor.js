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
      .then((response) => response.text())
      .then((cssContent) => {
        const regex = /\.fa-([a-zA-Z0-9-]+):before\s*\{/g;

        const icons = [];
        let match;
        while ((match = regex.exec(cssContent)) !== null) {
          icons.push(`fa-${match[1]}`);
        }

        availableFAIcons = [...new Set(icons)];
        console.log('FontAwesome Icons geladen:', availableFAIcons.length);
        return availableFAIcons;
      })
      .catch((err) => {
        logdata('Fehler beim Laden/Parsen von all.min.css:' + err, 'error');
        availableFAIcons = [];
        return [];
      });
  },
  generateFormField(key, fieldSchema, value = '', parentKey = '', type = '') {
    const container = this.createFormFieldContainer(fieldSchema, key);

    let input;
    const fullKey = parentKey ? `${parentKey}.${key}` : key; // Verschachtelte Schlüssel

    if (key === 'authorization' || key === 'authorization_read') {
      // 1) Container + Label für das Feld
      const container = this.createFormFieldContainer(fieldSchema, key);

      // 2) Hidden Input zum Speichern als JSON
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = fullKey;
      hiddenInput.id = fullKey;
      hiddenInput.dataset.type = 'json';

      let currentValue = Array.isArray(value) ? [...value] : [];
      hiddenInput.value = JSON.stringify(currentValue);
      container.appendChild(hiddenInput);

      // 3) Container für die Checkboxen
      const checkboxContainer = document.createElement('div');
      // CSS-Klasse zum flex-wrap
      checkboxContainer.classList.add('checkbox-user-container');

      // 4) Nutzerliste laden
      ipcRenderer.invoke('get-all-users')
        .then((allUsers) => {
          allUsers.forEach((usr) => {
            // Ausgewählt?
            const isChecked = currentValue.includes(usr.user);

            // Ein Label als Wrapper für Checkbox + User-Name
            const labelEl = document.createElement('label');
            labelEl.style.display = 'inline-flex';
            labelEl.style.alignItems = 'center';
            labelEl.style.marginRight = '1rem';
            // Du kannst margin oder padding anpassen,
            // oder auch komplett via CSS-Klasse.

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = usr.user;
            checkbox.checked = isChecked;
            checkbox.style.marginRight = '4px';

            checkbox.addEventListener('change', () => {
              if (checkbox.checked && !currentValue.includes(usr.user)) {
                currentValue.push(usr.user);
              } else if (!checkbox.checked) {
                currentValue = currentValue.filter(u => u !== usr.user);
              }
              hiddenInput.value = JSON.stringify(currentValue);
            });

            // Textknoten für den Anzeigenamen
            const textNode = document.createTextNode(usr.name);

            // Alles ins Label
            labelEl.appendChild(checkbox);
            labelEl.appendChild(textNode);

            // Label in den Container
            checkboxContainer.appendChild(labelEl);
          });
        })
        .catch((err) => {
          console.error('Fehler beim Laden aller Benutzer:', err);
        });

      container.appendChild(checkboxContainer);

      return container;
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^\\d{4}$') {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.id = fullKey;
      input.name = fullKey;
      input.maxLength = fieldSchema.maxLength || 4; // Standard 4-stellig

      input.addEventListener('input', (event) => {
        event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      });

      container.appendChild(input);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|svg|gif|webp)$') {

      const preview = document.createElement('img');
      preview.alt = 'Icon Vorschau';
      preview.style.width = '50px';
      preview.style.height = '50px';
      preview.style.objectFit = 'cover';

      // Readonly-Feld
      input = document.createElement('input');
      input.type = 'text';
      input.id = fullKey;
      input.name = fullKey;
      input.value = value;
      input.readOnly = true;

      if(!value){
        preview.src = 'img/no-pic.png';
      } else {
        ipcRenderer.invoke('get-icon-path', {
          fileName: value,
          subFolder: fieldSchema.$comment,
          dataFolder: currentDataFolder
        }).then((resolvedPath) => {
          preview.src = resolvedPath;
        }).catch((error) => {
          logdata(`Fehler beim Ermitteln des Icon-Pfads: ${error}`, 'error');
          preview.src = 'img/no-pic.png';
        });
      }

      // Durchsuchen-Button
      const uploadButton = document.createElement('button');
      uploadButton.textContent = 'Durchsuchen';
      uploadButton.type = 'button';
      uploadButton.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.jpg,.jpeg,.png,.svg,.gif,.webp';
        fileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
            ipcRenderer.invoke('upload-icon', file.path, fieldSchema.$comment).then((newIconName) => {
              input.value = newIconName;
              preview.src = `../../${currentDataFolder}/${fieldSchema.$comment}/${newIconName}`;
            });
          }
        });
        fileInput.click();
      });

      // Container aufbauen
      const uploadContainer = document.createElement('div');
      uploadContainer.classList.add('icon-upload-container');
      uploadContainer.appendChild(preview);
      uploadContainer.appendChild(input);
      uploadContainer.appendChild(uploadButton);
      container.appendChild(uploadContainer);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^fa[a-zA-Z-]*$') {
      // Container
      const container = this.createFormFieldContainer(fieldSchema, key);

      // Wrapper für Select + Icon
      const iconWrapper = document.createElement('div');
      iconWrapper.classList.add('icon-select-wrapper');

      const iconPreview = document.createElement('i');
      iconPreview.style.marginRight = '8px';
      iconPreview.classList.add('fa');
      if (value) {
        iconPreview.classList.add(value);
      }

      // Select-Feld
      const select = document.createElement('select');
      select.name = fullKey;
      select.id = fullKey;

      // Option "leer" oder Standard
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Icon wählen --';
      select.appendChild(emptyOption);

      // Alle bekannten FontAwesome-Icons in den Select packen
      availableFAIcons.forEach((iconClass) => {
        const opt = document.createElement('option');
        opt.value = iconClass;
        opt.textContent = iconClass; // oder nur iconClass.slice(3)?
        if (iconClass === value) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      // Beim Ändern => i-Klasse aktualisieren
      select.addEventListener('change', () => {
        iconPreview.className = 'fa';
        if (select.value) {
          iconPreview.classList.add(select.value);
        }
      });

      // Zusammenbauen
      iconWrapper.appendChild(iconPreview);
      iconWrapper.appendChild(select);
      container.appendChild(iconWrapper);

      return container; // return, damit es dem DOM hinzugefügt wird
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^#([A-Fa-f0-9]{6})$') {
      // Erst ein Wrapper-Element erstellen
      const colorWrapper = document.createElement('div');
      colorWrapper.classList.add('color-field-wrapper');

      input = document.createElement('input');
      input.type = 'text';
      input.name = fullKey;
      input.id = fullKey;
      input.value = value;         // e.g. "#FF0000"
      input.placeholder = '#RRGGBB';
      input.classList.add('color-input');

      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.classList.add('color-picker');
      colorPicker.value = this.isHexColor(value) ? value : '#000000';

      input.addEventListener('input', () => {
        if (this.isHexColor(input.value)) {
          colorPicker.value = input.value;
        }
      });

      colorPicker.addEventListener('input', () => {
        input.value = colorPicker.value.toUpperCase();
      });

      // Beide Felder ins Wrapper-Element packen
      colorWrapper.appendChild(input);
      colorWrapper.appendChild(colorPicker);

      // Und dieses Wrapper-Element kommt dann in den Container
      container.appendChild(colorWrapper);
    }
    else if (fieldSchema.type === 'string' && fieldSchema.pattern === '^[a-zA-Z0-9_-]+\\.\\d+\\.[a-zA-Z0-9._-]+$') {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.id = fullKey;
      input.name = fullKey;
      input.placeholder = 'ID auswählen oder eingeben...';

      const dropdown = document.createElement('datalist');
      dropdown.id = `${fullKey}-options`;
      input.setAttribute('list', dropdown.id);

      // Asynchrone Filterung der IDs
      input.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase().trim();

        // Mehrere Suchbegriffe durch Leerzeichen trennen
        const keywords = query.split(/\s+/); // Trennung nach Leerzeichen

        this.loadIoBrokerIDs()
          .then((ids) => {
            // IDs filtern: Alle Schlüsselwörter müssen enthalten sein
            const filteredIds = ids.filter((id) =>
              keywords.every((keyword) => id.toLowerCase().includes(keyword))
            ).slice(0, 50); // Maximal 50 Ergebnisse

            dropdown.innerHTML = ''; // Vorherige Optionen löschen

            filteredIds.forEach((id) => {
              const option = document.createElement('option');
              option.value = id;
              dropdown.appendChild(option);
            });
          })
          .catch((error) => {
            logdata('Fehler beim Laden der IDs: ' + error, 'error');
          });
      });

      container.appendChild(dropdown);
    }
    else if (fieldSchema.type === 'string' && !fieldSchema.enum) {
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
    }
    else if (fieldSchema.type === 'string' && fieldSchema.enum) {
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
    }
    else if (fieldSchema.type === 'boolean') {
      input = document.createElement('select');
      input.name = fullKey;
      input.id = fullKey;
      input.dataset.type = 'boolean'; // Typ als Hinweis speichern
      input.innerHTML = `
          <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ja</option>
          <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Nein</option>`;
    }
    else if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
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
    }
    else if (fieldSchema.type === 'array' && fieldSchema.items?.type === 'object') {
      const arrayContainer = document.createElement('div');
      arrayContainer.classList.add('array-container');
      arrayContainer.dataset.key = fullKey;

      const renderArrayItems = () => {
        const oldCards = arrayContainer.querySelectorAll('.object-card');
        oldCards.forEach(el => el.remove());

        value.forEach((item, index) => {
          const card = document.createElement('div');
          card.classList.add('array-item', 'object-card');
          card.dataset.index = index;

          Object.keys(fieldSchema.items.properties).forEach((subKey) => {
            const subFieldSchema = fieldSchema.items.properties[subKey];
            const subValue = item[subKey] || '';
            const subField = editorJS.generateFormField(
              subKey,
              subFieldSchema,
              subValue,
              `${fullKey}[${index}]`
            );
            if (subField) {
              subField.addEventListener('input', e => {
                item[subKey] = e.target.value;
              });
              card.appendChild(subField);
            }
          });

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Löschen';
          deleteButton.type = 'button';
          deleteButton.addEventListener('click', () => {
            value.splice(index, 1);
            renderArrayItems();
          });
          card.appendChild(deleteButton);

          arrayContainer.insertBefore(card, addButton);
        });
      };

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.textContent = 'Hinzufügen';
      addButton.addEventListener('click', () => {
        const newItem = {};
        Object.keys(fieldSchema.items.properties).forEach((subKey) => {
          newItem[subKey] = fieldSchema.items.properties[subKey].default || '';
        });
        value.push(newItem);
        renderArrayItems();
      });

      arrayContainer.appendChild(addButton);

      renderArrayItems();

      container.appendChild(arrayContainer);
    }
    else if (fieldSchema.type === 'array') {
      input = document.createElement('textarea');
      input.value = Array.isArray(value) ? value.join('\n') : '';
      input.id = fullKey;
      input.name = fullKey;
    }
    else {
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
      logdata(`Speichern von ${input.name || input.id}`);
      const key = input.name || input.id;
      let value;

      const fieldType = input.dataset.type;

      // Typ erkennen und Wert korrekt interpretieren
      if (fieldType === 'boolean') {
        value = input.value === 'true';
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
        value = input.value.split('\n').map((item) => item.trim()).filter((item) => item !== '');
      }
      else if (fieldType === 'json') {
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

