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
      logdata(key + " -> " + value);
      if (fieldSchema.type === 'object') {
        // Objekte als Cards anzeigen
        this.generateObjectCard(key, value, fieldSchema);
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

  generateObjectCard(key, value, fieldSchema) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.style.border = '1px solid #ccc';
    card.style.padding = '10px';
    card.style.marginBottom = '10px';

    const cardHeader = document.createElement('h4');
    cardHeader.textContent = fieldSchema.description || key;
    card.appendChild(cardHeader);

    Object.keys(fieldSchema.properties).forEach((subKey) => {
      logdata(subKey);
      const subFieldSchema = fieldSchema.properties[subKey];
      const subValue = value[subKey] !== undefined ? value[subKey] : subFieldSchema.default || '';
      const subField = editorJS.generateFormField(`${key}.${subKey}`, subFieldSchema, subValue);
      logdata(subField);
      if (subField) card.appendChild(subField);
    });
    logdata("Card ready");
    editorForm.appendChild(card);
  },

  saveSidebarData(content) {
    const formContainer = document.querySelector('#editor-form');
    const inputs = formContainer.querySelectorAll('input, select, textarea');

    // Hilfsfunktion, um verschachtelte Objekte zu erstellen
    const setNestedValue = (obj, path, value) => {
      const keys = path.split('.');
      keys.reduce((acc, key, index) => {
        if (index === keys.length - 1) {
          // Letzter Key, Wert setzen
          if (value !== '' && value !== null && value !== undefined) {
            acc[key] = value;
          }
        } else {
          // Zwischenobjekte erzeugen
          if (!acc[key]) acc[key] = {};
          return acc[key];
        }
      }, obj);
    };

    // Neues Objekt basierend auf dem Schema erstellen
    const updatedContent = { ...content };

    inputs.forEach((input) => {
      const key = input.name || input.id;
      const value =
        input.type === 'checkbox'
          ? input.checked
          : input.type === 'number' || input.type === 'integer'
            ? input.value !== '' ? Number(input.value) : null
            : input.value;

      // Verschachtelte Objekte/Arrays verarbeiten
      setNestedValue(updatedContent, key, value);
    });

    // Alle leeren Felder und Null-Werte entfernen
    const cleanContent = this.cleanObject(updatedContent);

    // Datei speichern
    ipcRenderer
      .invoke('write-file', {
        filePath: `${currentDataFolder}/sidebar.json`,
        content: JSON.stringify(cleanContent, null, 2),
      })
      .then(() => {
        modalJS.showModal('Sidebar-Konfiguration erfolgreich gespeichert.');
        editorJS.showStartPage();
      })
      .catch((error) => {
        console.error('Fehler beim Speichern der Sidebar:', error);
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

};
