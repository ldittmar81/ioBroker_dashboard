const usersJS = {

  showUserForm(user = null) {
    editorJS.showEditor(); // Zeige den Editor
    editorForm.innerHTML = ''; // Bestehendes Formular löschen

    const isNewUser = !user; // Unterscheide zwischen Neu und Bearbeiten

    // Überschrift hinzufügen
    const header = document.createElement('h3');
    header.textContent = isNewUser ? 'Neuer Anwender' : `Bearbeite: ${user?.name || ''}`;
    editorForm.appendChild(header);

    // Hole das Schema
    ipcRenderer.invoke('get-schema', 'users.schema.json').then((fieldSchema) => {
      if (!fieldSchema || !fieldSchema.items || !fieldSchema.items.properties) {
        editorJS.logdata('Fehler beim Laden des Schemas.');
        return;
      }

      const fields = fieldSchema.items.properties;

      // Iteriere über die Felder im Schema
      Object.keys(fields).forEach((key) => {

        const fieldSchema = fields[key];
        const value = user?.[key] || '';

        // Input-Feld basierend auf Typ
        if(key === 'user') {
          const container = editorJS.createFormFieldContainer(fieldSchema, key);
          const input = document.createElement('input');
          input.type = 'text';
          input.value = value;
          input.id = key;
          input.name = key;
          input.readOnly = !!value;
          container.appendChild(input);
          editorForm.appendChild(container);
        }
        else if (key === 'pin') {
          const container = editorJS.createFormFieldContainer(fieldSchema, key);
          const input = document.createElement('input');
          input.type = 'text';
          input.value = value;
          input.id = key;
          input.name = key;
          if (fieldSchema.pattern) {
            input.pattern = fieldSchema.pattern;
          }
          if (fieldSchema.maxLength) {
            input.maxLength = fieldSchema.maxLength;
          }

          input.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
          });

          container.appendChild(input);
          editorForm.appendChild(container);
        }
        else if (key === 'icon') {
          const iconContainer = editorJS.createFormFieldContainer(fieldSchema, key);

          // Icon-Upload-Feld
          const iconUploadContainer = document.createElement('div');
          iconUploadContainer.classList.add('icon-upload-container');

          // Vorschau
          const iconLink = user?.icon ? `../../${currentContent.dataFolder}/img/users/${user.icon}` : 'img/no-user.webp';
          const iconPreview = document.createElement('img');
          iconPreview.id = 'icon-preview';
          iconPreview.src = iconLink;
          iconPreview.alt = 'Icon Vorschau';
          iconPreview.style.width = '50px';
          iconPreview.style.height = '50px';
          iconPreview.style.objectFit = 'cover';
          iconUploadContainer.appendChild(iconPreview);
          editorJS.logdata(iconLink);

          // Readonly Textfeld
          const input = document.createElement('input');
          input.type = 'text';
          input.id = 'icon';
          input.name = 'icon';
          input.value = value;
          input.readOnly = true;
          iconUploadContainer.appendChild(input);

          // Durchsuchen-Button
          const iconUploadButton = document.createElement('button');
          iconUploadButton.textContent = 'Durchsuchen';
          iconUploadButton.type = 'button';
          iconUploadButton.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.jpg,.jpeg,.png,.svg,.gif,.webp';
            fileInput.addEventListener('change', (event) => {
              const file = event.target.files[0];
              if (file) {
                ipcRenderer.invoke('upload-icon', file.path).then((newIconName) => {
                  input.value = newIconName;
                  iconPreview.src = `../../${currentContent.dataFolder}/img/users/${newIconName}`;
                  alert(`Icon hochgeladen: ${newIconName}`);
                });
              }
            });
            fileInput.click();
          });

          iconUploadContainer.appendChild(iconUploadButton);
          iconContainer.appendChild(iconUploadContainer);
          editorForm.appendChild(iconContainer);
        }
        else {
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
      saveBtn.addEventListener('click', () => this.saveUserData(user?.user));

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', editorJS.showStartPage);

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      editorForm.appendChild(actions);

    }).catch((error) => {
      editorJS.logdata('Fehler beim Abrufen des Schemas:' + error);
    });
  },

  saveUserData(existingUserId = null) {
    const formData = new FormData(editorForm);
    const newUser = {};

    formData.forEach((value, key) => {
      if (key === 'pin' && value.trim() === '') {
        // Überspringe leeres "pin"-Feld
        return;
      }
      newUser[key] = value.trim();
    });

    editorJS.logdata('Userdaten: ' + JSON.stringify(newUser, null, 2));

    // Validierung
    if (!newUser.user || !newUser.name || !newUser.icon) {
      alert('Die Felder Benutzername, Name und Icon sind erforderlich.');
      return;
    }

    if (newUser.pin && !/^\d{4}$/.test(newUser.pin)) {
      alert('Die PIN muss 4-stellig sein.');
      return;
    }

    ipcRenderer.invoke('save-user', { newUser, existingUserId }).then(() => {
      alert('Anwender erfolgreich gespeichert.');
      editorJS.logdata('Anwenderliste wird aktualisiert.');
      editorJS.showStartPage();
    }).catch((error) => {
      editorJS.logdata('Fehler beim Speichern des Anwenders: ' + error);
      alert('Fehler beim Speichern des Anwenders.');
    });
  }
}
