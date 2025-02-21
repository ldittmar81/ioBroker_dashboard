const deviceJS = {
  showDeviceForm(content = {}, schema, path ) {
    editorJS.showEditor();
    editorForm.innerHTML = '';
    mainSchema = schema;
    subtypeDeviceSelected = '';
    subtypeControlSelected = '';

    editorForm.appendChild(editorJS.createHeader('Geräte-Konfiguration'));

    // Durch Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = content[key] !== undefined ? content[key] : fieldSchema.default || '';
      const isRequired = schema.required?.includes(key);

      const field = editorJS.generateFormField('devices', subtypeDeviceSelected, key, fieldSchema, value, isRequired);
      if (field) editorForm.appendChild(field);

    });

    const actions = editorJS.createButtons(() => {
      this.saveOverviewData(content, path);
    });
    editorForm.appendChild(actions);
  },

  saveOverviewData(content, path) {
    const filePath = `${currentDataFolder}/devices/${path}`;
    editorJS.saveData(content, filePath);
  }
}
