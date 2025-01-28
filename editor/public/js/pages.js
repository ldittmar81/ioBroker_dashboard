const pagesJS = {
  showMainPage(content = {}, schema, filePath) {
    // Editorbereich anzeigen
    editorJS.showEditor();
    editorForm.innerHTML = ''; // altes Formular leeren

    // Überschrift hinzufügen
    const headerText = content.name
      ? `Bearbeite Hauptseite: ${content.name}`
      : `Neue Hauptseite`;
    editorForm.appendChild(editorJS.createHeader(headerText));

    let subtype = '';
    // Durch die Schema-Eigenschaften iterieren und Felder erzeugen
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = (content[key] !== undefined) ? content[key] : fieldSchema.default;

      const field = editorJS.generateFormField('main', subtype, key, fieldSchema, value);
      if (field) {
        editorForm.appendChild(field);
      }

    });

    // Speichern- und Abbrechen-Buttons
    const actions = editorJS.createButtons(() => {
      this.saveMainPage(content, filePath);
    });
    editorForm.appendChild(actions);
  },

  saveMainPage(content, filePath) {
    editorJS.saveData(content, filePath);
  }
}
