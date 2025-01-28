const overviewJS = {
  showOverviewForm(content = {}, schema, file = 'overview.json') {
    editorJS.showEditor();
    editorForm.innerHTML = '';

    editorForm.appendChild(editorJS.createHeader('Übersichtsseite-Konfiguration'));

    // Durch Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = content[key] !== undefined ? content[key] : fieldSchema.default || '';
      const isRequired = fieldSchema.required?.includes(key);

      if (fieldSchema.type === 'object') {
        this.generateObjectCard(key, value, fieldSchema, isRequired);
      } else {
        const field = editorJS.generateFormField('overview', '', key, fieldSchema, value, isRequired);
        if (field) editorForm.appendChild(field);
      }
    });

    const actions = editorJS.createButtons(() => {
      this.saveOverviewData(content, file);
    });
    editorForm.appendChild(actions);
  },
  generateObjectCard(key, value, fieldSchema, required = false) {
    const card = editorJS.generateCardHeader(fieldSchema.description || key, required);

    Object.keys(fieldSchema.properties).forEach((subKey) => {
      const subFieldSchema = fieldSchema.properties[subKey];
      const subValue = value[subKey] !== undefined ? value[subKey] : subFieldSchema.default || '';
      const isRequired = fieldSchema.required?.includes(key);

      const subField = editorJS.generateFormField('overview', '',`${key}.${subKey}`, subFieldSchema, subValue, isRequired);
      if (subField) card.appendChild(subField);
    });

    editorForm.appendChild(card);
  },
  saveOverviewData(content,file) {
    const filePath = `${currentDataFolder}/${file}`;
    editorJS.saveData(content, filePath);
  }
}
