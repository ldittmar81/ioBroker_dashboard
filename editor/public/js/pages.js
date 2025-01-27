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

    // Durch die Schema-Eigenschaften iterieren und Felder erzeugen
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = (content[key] !== undefined) ? content[key] : fieldSchema.default;

      if(key === 'type'){
        const container = editorJS.createFormFieldContainer(fieldSchema, key);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.id = key;
        input.name = key;
        input.readOnly = true;
        container.appendChild(input);
        editorForm.appendChild(container);
      }
      else {
        const field = editorJS.generateFormField(key, fieldSchema, value);
        if (field) {
          editorForm.appendChild(field);
        }
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
