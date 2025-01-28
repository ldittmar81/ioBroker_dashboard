const formFieldsJS = {

  createAuthorizationField(fullKey, value, container) {
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = fullKey;
    hiddenInput.id = fullKey;
    hiddenInput.dataset.type = 'json';

    let currentValue = Array.isArray(value) ? [...value] : [];
    hiddenInput.value = JSON.stringify(currentValue);
    container.appendChild(hiddenInput);

    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-user-container');

    ipcRenderer.invoke('get-all-users')
      .then((allUsers) => {
        allUsers.forEach((usr) => {
          // Ausgewählt?
          const isChecked = currentValue.includes(usr.user);

          const labelEl = document.createElement('label');
          labelEl.style.display = 'inline-flex';
          labelEl.style.alignItems = 'center';
          labelEl.style.marginRight = '1rem';

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

          const textNode = document.createTextNode(usr.name);

          labelEl.appendChild(checkbox);
          labelEl.appendChild(textNode);

          checkboxContainer.appendChild(labelEl);
        });
      })
      .catch((err) => {
        console.error('Fehler beim Laden aller Benutzer:', err);
      });

    container.appendChild(checkboxContainer);
  },

  createPinField(value, fullKey, fieldSchema, container) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.required = fieldSchema.required || false;
    input.maxLength = fieldSchema.maxLength || 4; // Standard 4-stellig

    input.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    });

    container.appendChild(input);
  },

  createImageUploadField(fullKey, value, fieldSchema, subtype, container) {
    const preview = document.createElement('img');
    preview.alt = 'Icon Vorschau';
    preview.style.width = '50px';
    preview.style.height = '50px';
    preview.style.objectFit = 'cover';

    // Readonly-Feld
    const input = document.createElement('input');
    input.type = 'text';
    input.id = fullKey;
    input.name = fullKey;
    input.value = value;
    input.readOnly = true;

    let subFolder = fieldSchema.$comment;
    if (subFolder && subFolder.includes('${subtype}')) {
      subFolder = subFolder.replace('${subtype}', subtype);
    }

    if (!value) {
      preview.src = 'img/no-pic.png';
    } else {
      ipcRenderer.invoke('get-icon-path', {
        fileName: value,
        subFolder: subFolder,
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
  },

  createIconSelectField(value, fullKey, container) {
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
  },

  createColorPickerField(fullKey, value, fieldSchema, container) {
    // Erst ein Wrapper-Element erstellen
    const colorWrapper = document.createElement('div');
    colorWrapper.classList.add('color-field-wrapper');

    const input = document.createElement('input');
    input.type = 'text';
    input.name = fullKey;
    input.id = fullKey;
    input.value = value;         // e.g. "#FF0000"
    input.placeholder = '#RRGGBB';
    input.classList.add('color-input');
    input.required = fieldSchema.required || false;

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
  },

  createIoBrokerIDField(value, fullKey, fieldSchema, container) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.placeholder = 'ID auswählen oder eingeben...';
    input.required = fieldSchema.required || false;

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
  },

  createInputTextField(value, fullKey, fieldSchema, container) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.required = fieldSchema.required || false;
    input.readOnly = fieldSchema.readOnly;

    if (fieldSchema.pattern) {
      input.pattern = fieldSchema.pattern;
    }

    if (fieldSchema.maxLength) {
      input.maxLength = fieldSchema.maxLength;
    }

    container.appendChild(input);
  },

  createEnumSelectorField(fullKey, fieldSchema, value, container) {
    // Dropdown für enum-Werte
    const input = document.createElement('select');
    input.name = fullKey;
    input.id = fullKey;
    input.required = fieldSchema.required || false;

    fieldSchema.enum.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      opt.selected = option === value;
      input.appendChild(opt);
    });

    container.appendChild(input);
  },

  createBooleanField(fullKey, value, fieldSchema, container) {
    const input = document.createElement('select');
    input.name = fullKey;
    input.id = fullKey;
    input.dataset.type = 'boolean';
    input.innerHTML = `
          <option value="" ${value === '' ? 'selected' : ''}></option>
          <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ja</option>
          <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Nein</option>`;
    input.required = fieldSchema.required || false;

    container.appendChild(input);
  },

  createNumberField(value, fullKey, fieldSchema, container) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.required = fieldSchema.required || false;

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

    container.appendChild(input);
  },

  createObjectCard(deep, fullKey, value, fieldSchema, type, subtype, container) {
    deep++;
    const arrayContainer = document.createElement('div');
    arrayContainer.classList.add('array-container');
    arrayContainer.dataset.key = fullKey;

    const renderArrayItems = () => {
      // Alte Cards entfernen
      const oldCards = arrayContainer.querySelectorAll('.object-card, .object-card-odd');
      oldCards.forEach(el => el.remove());

      // Für jedes Objekt im Array
      value.forEach((item, index) => {
        const card = document.createElement('div');
        card.dataset.index = index;

        if (deep % 2 === 0) card.classList.add('object-card');
        else card.classList.add('object-card-odd');

        const subKeys = Object.keys(fieldSchema.items.properties);

        const titleKey = subKeys[0]; // z.B. "category" oder "name"
        const firstFieldSchema = fieldSchema.items.properties[titleKey];
        const firstFieldValue = item[titleKey] || '';

        const headerDiv = document.createElement('div');
        headerDiv.classList.add('collapsible-header');

        const firstField = editorJS.generateFormField(
          type,
          subtype,
          titleKey,
          firstFieldSchema,
          firstFieldValue,
          `${fullKey}[${index}]`,
          deep
        );
        headerDiv.appendChild(firstField);

        // 5) Button zum Ein-/Ausklappen
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.textContent = '▼'; // oder "►" / "▼"
        toggleBtn.style.marginLeft = '8px';

        // collapsibleContainer: Restliche Felder
        const collapsibleContainer = document.createElement('div');
        collapsibleContainer.classList.add('collapsible-content');

        // Standard: eingeklappt
        let isCollapsed = true;
        collapsibleContainer.style.display = 'none';
        toggleBtn.textContent = '►';

        toggleBtn.addEventListener('click', () => {
          isCollapsed = !isCollapsed;
          if (isCollapsed) {
            collapsibleContainer.style.display = 'none';
            toggleBtn.textContent = '►';
          } else {
            collapsibleContainer.style.display = '';
            toggleBtn.textContent = '▼';
          }
        });

        headerDiv.appendChild(toggleBtn);
        card.appendChild(headerDiv);

        subKeys.slice(1).forEach((subKey) => {
          const subFieldSchema = fieldSchema.items.properties[subKey];
          const subValue = item[subKey] || '';
          const subField = editorJS.generateFormField(
            type,
            subtype,
            subKey,
            subFieldSchema,
            subValue,
            `${fullKey}[${index}]`,
            deep
          );
          if (subField) {
            subField.addEventListener('input', e => {
              item[subKey] = e.target.value;
            });
            collapsibleContainer.appendChild(subField);
          }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Löschen';
        deleteButton.type = 'button';
        deleteButton.style.marginTop = '8px';
        deleteButton.addEventListener('click', () => {
          value.splice(index, 1);
          renderArrayItems();
        });
        collapsibleContainer.appendChild(deleteButton);

        // collapsibleContainer unten ans card anhängen
        card.appendChild(collapsibleContainer);

        // Ins DOM einfügen
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
  },

  createArrayField(value, fullKey, fieldSchema, container) {
    const input = document.createElement('textarea');
    input.value = Array.isArray(value) ? value.join('\n') : '';
    input.id = fullKey;
    input.name = fullKey;
    input.required = fieldSchema.required || false;
    container.appendChild(input);
  },

}
