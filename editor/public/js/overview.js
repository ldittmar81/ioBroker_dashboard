const overviewJS = {
  showOverviewForm(content = {}, schema, file = 'overview.json') {
    editorJS.showEditor();
    editorForm.innerHTML = '';

    editorForm.appendChild(editorJS.createHeader('Übersichtsseite-Konfiguration'));

    // Durch Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = content[key] !== undefined ? content[key] : fieldSchema.default || '';
      if (fieldSchema.type === 'object') {
        this.generateObjectCard(key, value, fieldSchema);
      } else {
        const field = editorJS.generateFormField(key, fieldSchema, value);
        if (field) editorForm.appendChild(field);
      }
    });

    const actions = editorJS.createButtons(() => {
      this.saveOverviewData(content, file);
    });
    editorForm.appendChild(actions);
  },
  generateObjectCard(key, value, fieldSchema) {
    const card = editorJS.generateCardHeader(fieldSchema.description || key);

    Object.keys(fieldSchema.properties).forEach((subKey) => {
      const subFieldSchema = fieldSchema.properties[subKey];
      const subValue = value[subKey] !== undefined ? value[subKey] : subFieldSchema.default || '';
      const subField = editorJS.generateFormField(`${key}.${subKey}`, subFieldSchema, subValue);
      if (subField) card.appendChild(subField);
    });

    editorForm.appendChild(card);
  },
  saveOverviewData(content,file) {
    const filePath = `${currentDataFolder}/${file}`;
    editorJS.saveData(content, filePath);
  }
}
