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

      if (fieldSchema.type === 'object') {
        // Objekte als Cards anzeigen
        this.generateObjectCard(key, value, fieldSchema, content);
      } else {
        // Standardfelder
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
    saveBtn.addEventListener('click', () => this.saveSidebarData(content));

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', editorJS.showStartPage);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    editorForm.appendChild(actions);
  },

  generateObjectCard(key, value, fieldSchema, content) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.style.border = '1px solid #ccc';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';

    const cardHeader = document.createElement('h4');
    cardHeader.textContent = fieldSchema.description || key;
    card.appendChild(cardHeader);

    Object.keys(fieldSchema.properties).forEach((subKey) => {
      const subFieldSchema = fieldSchema.properties[subKey];
      const subValue = value[subKey] !== undefined ? value[subKey] : subFieldSchema.default || '';
      const subField = editorJS.generateFormField(`${key}-${subKey}`, subFieldSchema, subValue);
      if (subField) card.appendChild(subField);
    });

    editorForm.appendChild(card);
  },

  saveSidebarData(content) {
    const formData = new FormData(editorForm);
    const updatedContent = {};

    formData.forEach((value, key) => {
      // Hier kannst du zusätzliche Logik für verschachtelte Objekte hinzufügen
      updatedContent[key] = value;
    });

    // Speichern
    ipcRenderer.invoke('write-file', {
      filePath: path.join(currentDataFolder, 'sidebar.json'),
      content: JSON.stringify(updatedContent, null, 2),
    }).then(() => {
      modalJS.showModal('Sidebar-Konfiguration erfolgreich gespeichert.');
      editorJS.showStartPage();
    }).catch((error) => {
      console.error('Fehler beim Speichern der Sidebar:', error);
    });
  },
};
