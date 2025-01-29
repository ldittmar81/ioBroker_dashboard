const formFieldsJS = {

  createAuthorizationField(fullKey, value, container, required = false) {
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = fullKey;
    hiddenInput.id = fullKey;
    hiddenInput.dataset.type = 'json';
    hiddenInput.required = required;

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

  createPinField(value, fullKey, fieldSchema, container, required = false) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.required = required;
    input.maxLength = fieldSchema.maxLength || 4; // Standard 4-stellig

    input.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    });

    container.appendChild(input);
  },

  createImageUploadField(fullKey, value, fieldSchema, subtype, container, required) {
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
    input.required = required;

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

  createIconSelectField(value, fullKey, container, required = false) {
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
    select.required = required;

    if(!required) {
      // Option "leer" oder Standard
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Icon wählen --';
      select.appendChild(emptyOption);
    }

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

    // Beim Ändern → i-Klasse aktualisieren
    select.addEventListener('change', () => {
      if (select.value) {
        iconWrapper.querySelector('svg').setAttribute('data-icon', select.value.substring(3));
      }
    });

    // Zusammenbauen
    iconWrapper.appendChild(iconPreview);
    iconWrapper.appendChild(select);
    container.appendChild(iconWrapper);
  },

  createColorPickerField(fullKey, value, fieldSchema, container, required = false) {
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
    input.required = required;

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.classList.add('color-picker');
    colorPicker.value = editorJS.isHexColor(value) ? value : '#000000';

    input.addEventListener('input', () => {
      if (editorJS.isHexColor(input.value)) {
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

  createIoBrokerIDField(value, fullKey, fieldSchema, container, required = false) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.placeholder = 'ID auswählen oder eingeben...';
    input.required = required;

    const dropdown = document.createElement('datalist');
    dropdown.id = `${fullKey}-options`;
    input.setAttribute('list', dropdown.id);

    // Asynchrone Filterung der IDs
    input.addEventListener('input', (event) => {
      const query = event.target.value.toLowerCase().trim();

      // Mehrere Suchbegriffe durch Leerzeichen trennen
      const keywords = query.split(/\s+/); // Trennung nach Leerzeichen

      editorJS.loadIoBrokerIDs()
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

    container.appendChild(input);
    container.appendChild(dropdown);
  },

  createInputTextField(value, fullKey, fieldSchema, container, required = false) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.required = required;
    input.readOnly = fieldSchema.readOnly;

    if (fieldSchema.pattern) {
      input.pattern = fieldSchema.pattern;
    }

    if (fieldSchema.maxLength) {
      input.maxLength = fieldSchema.maxLength;
    }

    container.appendChild(input);
  },

  createEnumSelectorField(fullKey, fieldSchema, value, container, required = false) {
    let input;

    if((value || fieldSchema.default) && fieldSchema.readOnly) {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value || fieldSchema.default;
      input.id = fullKey;
      input.name = fullKey;
      input.required = required;
      input.readOnly = true;
    }
    else {
      input = document.createElement('select');
      input.name = fullKey;
      input.id = fullKey;
      input.required = required;

      if (!required) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "";
        opt.selected = "" === value;
        input.appendChild(opt);
      }

      fieldSchema.enum.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        opt.selected = option === value;
        input.appendChild(opt);
      });
    }

    container.appendChild(input);
  },

  createBooleanField(fullKey, value, fieldSchema, container, required = false) {
    const input = document.createElement('select');
    input.name = fullKey;
    input.id = fullKey;
    input.dataset.type = 'boolean';

    // Basis-Optionen „true“ und „false“
    let optionsHtml = `
    <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ja</option>
    <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Nein</option>
  `;

    // Falls nicht required -> leeren Eintrag hinzufügen
    if (!required) {
      // Falls value aktuell '' sein soll
      optionsHtml = `
      <option value="" ${value === '' ? 'selected' : ''}></option>
      ${optionsHtml}
    `;
    }

    input.innerHTML = optionsHtml;
    input.required = required;

    container.appendChild(input);
  },

  createNumberField(value, fullKey, fieldSchema, container, required = false) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.id = fullKey;
    input.name = fullKey;
    input.required = required;

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

  createObjectCard(deep, fullKey, value, fieldSchema, type, subtype, container, required = false) {
    deep++;
    const arrayContainer = document.createElement('div');
    arrayContainer.classList.add('array-container');
    arrayContainer.dataset.key = fullKey;

    const renderArrayItems = () => {
      const oldCards = arrayContainer.querySelectorAll('.object-card, .object-card-odd');
      oldCards.forEach(el => el.remove());

      value.forEach((item, index) => {
        logdata(`item: ${JSON.stringify(item)}`, 'debug');
        const card = document.createElement('div');
        card.dataset.index = index;

        if (deep % 2 === 0) card.classList.add('object-card');
        else card.classList.add('object-card-odd');

        const subKeys = Object.keys(fieldSchema.items.properties);
        const requiredKeys = Object.keys(fieldSchema.required || {});

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
          requiredKeys.includes(titleKey),
          `${fullKey}[${index}]`,
          deep
        );
        headerDiv.appendChild(firstField);

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
          const subFieldRequiredKeys = fieldSchema.items.required || [];
          const subValue = item[subKey] || '';
          const subField = editorJS.generateFormField(
            type,
            subtype,
            subKey,
            subFieldSchema,
            subValue,
            subFieldRequiredKeys.includes(subKey),
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

  createArrayField(value, fullKey, fieldSchema, container, required = false) {
    const input = document.createElement('textarea');
    input.value = Array.isArray(value) ? value.join('\n') : '';
    input.id = fullKey;
    input.name = fullKey;
    input.required = required;
    container.appendChild(input);
  },

}
