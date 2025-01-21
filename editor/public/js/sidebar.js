const sidebarJS = {
  showSidebarForm(content = {}, schema) {
    editorJS.showEditor();
    editorForm.innerHTML = '';

    const header = document.createElement('h3');
    header.textContent = 'Sidebar-Konfiguration';
    editorForm.appendChild(header);

    // Durch Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = content[key] !== undefined ? content[key] : fieldSchema.default || '';

      // Spezielle Felder
      if (key === 'openWeatherMap') {
        const container = editorJS.createFormFieldContainer(fieldSchema, key);

        // Aktivierung
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.id = `${key}-enabled`;
        enabledCheckbox.checked = value.enabled || false;
        container.appendChild(enabledCheckbox);

        const additionalFields = document.createElement('div');
        additionalFields.id = `${key}-fields`;
        additionalFields.style.display = enabledCheckbox.checked ? 'block' : 'none';

        enabledCheckbox.addEventListener('change', () => {
          additionalFields.style.display = enabledCheckbox.checked ? 'block' : 'none';
        });

        // Dynamisch andere Eigenschaften hinzufügen
        Object.keys(fieldSchema.properties).forEach((subKey) => {
          if (subKey === 'enabled') return; // Überspringe das Hauptfeld

          const subFieldSchema = fieldSchema.properties[subKey];
          const subValue = value[subKey] || subFieldSchema.default || '';
          const subField = editorJS.generateFormField(`${key}-${subKey}`, subFieldSchema, subValue);
          if (subField) additionalFields.appendChild(subField);
        });

        container.appendChild(additionalFields);
        editorForm.appendChild(container);
      } else if (key === 'ioBroker_ical') {
        const container = editorJS.createFormFieldContainer(fieldSchema, key);

        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.id = `${key}-enabled`;
        enabledCheckbox.checked = value.enabled || false;
        container.appendChild(enabledCheckbox);

        const additionalFields = document.createElement('div');
        additionalFields.id = `${key}-fields`;
        additionalFields.style.display = enabledCheckbox.checked ? 'block' : 'none';

        enabledCheckbox.addEventListener('change', () => {
          additionalFields.style.display = enabledCheckbox.checked ? 'block' : 'none';
        });

        const calendarsLabel = document.createElement('label');
        calendarsLabel.textContent = 'Kalender';
        additionalFields.appendChild(calendarsLabel);

        const calendarsContainer = document.createElement('div');
        calendarsContainer.id = 'calendars-container';
        calendarsContainer.classList.add('pages-container');

        value.calendars?.forEach((calendar, index) => {
          const calRow = document.createElement('div');
          calRow.classList.add('page-row');

          const calText = document.createElement('span');
          calText.textContent = `Cal: ${calendar.cal}, RGB: ${calendar.rgb}`;
          calRow.appendChild(calText);

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Löschen';
          deleteButton.type = 'button';
          deleteButton.addEventListener('click', () => {
            value.calendars.splice(index, 1);
            sidebarJS.showSidebarForm(content, schema);
          });
          calRow.appendChild(deleteButton);

          calendarsContainer.appendChild(calRow);
        });

        const addCalendarButton = document.createElement('button');
        addCalendarButton.textContent = 'Neuen Kalender hinzufügen';
        addCalendarButton.type = 'button';
        addCalendarButton.addEventListener('click', () => {
          const newCalendar = { cal: '', rgb: '#FFFFFF' };
          value.calendars = value.calendars || [];
          value.calendars.push(newCalendar);
          sidebarJS.showSidebarForm(content, schema);
        });

        additionalFields.appendChild(calendarsContainer);
        additionalFields.appendChild(addCalendarButton);

        container.appendChild(additionalFields);
        editorForm.appendChild(container);
      } else {
        const field = editorJS.generateFormField(key, fieldSchema, value);
        if (field) editorForm.appendChild(field);
      }
    });

    // Speichern- und Abbrechen-Buttons
    const actions = document.createElement('div');
    actions.classList.add('actions');

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Speichern';
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => sidebarJS.saveSidebarData(content));

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', editorJS.showStartPage);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    editorForm.appendChild(actions);
  },

  saveSidebarData(content) {
    const formData = new FormData(editorForm);
    const updatedContent = {};

    formData.forEach((value, key) => {
      // Hier kannst du zusätzliche Logik für verschachtelte Objekte hinzufügen
      updatedContent[key] = value;
    });

    ipcRenderer.send('save-config', { fileName: 'sidebar.json', content: updatedContent });
    editorJS.showStartPage();
  },
};
