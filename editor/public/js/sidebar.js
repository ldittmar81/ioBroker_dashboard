const sidebarJS = {
  showSidebarForm(content = {}, schema, file = 'sidebar.json') {
    editorJS.showEditor();
    editorForm.innerHTML = '';

    editorForm.appendChild(editorJS.createHeader('Sidebar-Konfiguration'));

    // Durch Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = content[key] !== undefined ? content[key] : fieldSchema.default || '';
      const isRequired = schema.required?.includes(key);

      if (fieldSchema.type === 'object') {
        this.generateObjectCard(key, value, fieldSchema, isRequired);
      } else {
        const field = editorJS.generateFormField('sidebar', '', key, fieldSchema, value, isRequired);
        if (field) editorForm.appendChild(field);
      }
    });

    const actions = editorJS.createButtons(() => {
      this.saveSidebarData(content, file);
    });
    editorForm.appendChild(actions);
  },

  generateObjectCard(key, value, fieldSchema, required = false) {
    const card = editorJS.generateCardHeader(fieldSchema.description || key, required);

    Object.keys(fieldSchema.properties).forEach((subKey) => {
      const subFieldSchema = fieldSchema.properties[subKey];
      const subValue = value[subKey] !== undefined ? value[subKey] : subFieldSchema.default || '';
      const isRequired = fieldSchema.required?.includes(key);

      if (subKey === 'imageSet') {
        logdata(subValue, 'info');
        // Container im gleichen Stil wie bei den anderen Feldern
        const container = editorJS.createFormFieldContainer(fieldSchema.properties[subKey], `${key}.${subKey}`, isRequired);

        // Erstelle ein SELECT
        const select = document.createElement('select');
        select.id = `${key}.${subKey}`;
        select.name = `${key}.${subKey}`;
        select.dataset.type = 'integer';

        // Optional: Lade dynamisch alle Ordner
        ipcRenderer
          .invoke('list-subfolders', 'assets/img/sidebar/weather') // Pfad, in dem gesucht werden soll
          .then((folders) => {
            folders.forEach((folder) => {
              const opt = document.createElement('option');
              opt.value = folder;
              opt.textContent = folder;
              if (folder === subValue) {
                opt.selected = true;
              }
              select.appendChild(opt);
            });
          })
          .catch((error) => {
            console.error('Fehler bei list-subfolders:', error);
          });

        select.addEventListener('change', (event) => {
          value[subKey] = event.target.value;
        });

        container.appendChild(select);
        card.appendChild(container);
      }
      else {
        const subField = editorJS.generateFormField('sidebar', '', `${key}.${subKey}`, subFieldSchema, subValue, isRequired);
        if (subField) card.appendChild(subField);
      }

    });

    editorForm.appendChild(card);
  },

  saveSidebarData(content,file) {
    const filePath = `${currentDataFolder}/${file}`;
    editorJS.saveData(content, filePath);
  }
};
