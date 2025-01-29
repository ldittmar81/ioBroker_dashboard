const overviewJS = {
  showOverviewForm(content = {}, schema, file = 'overview.json') {
    editorJS.showEditor();
    editorForm.innerHTML = '';
    mainSchema = schema;
    subtypeDeviceSelected = '';
    subtypeControlSelected = '';

    editorForm.appendChild(editorJS.createHeader('Übersichtsseite-Konfiguration'));

    // Durch Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = content[key] !== undefined ? content[key] : fieldSchema.default || '';
      const isRequired = schema.required?.includes(key);

      const field = editorJS.generateFormField('overview', subtypeDeviceSelected, key, fieldSchema, value, isRequired);
      if (field) editorForm.appendChild(field);

    });

    const actions = editorJS.createButtons(() => {
      this.saveOverviewData(content, file);
    });
    editorForm.appendChild(actions);
  },

  saveOverviewData(content,file) {
    const filePath = `${currentDataFolder}/${file}`;
    editorJS.saveData(content, filePath);
  }
}
