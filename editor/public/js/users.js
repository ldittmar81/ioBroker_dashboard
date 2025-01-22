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
        logdata('Fehler beim Laden des Schemas.','error');
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
          const iconLink = user?.icon ? `../../${currentDataFolder}/img/users/${user.icon}` : 'img/no-user.webp';
          const iconPreview = document.createElement('img');
          iconPreview.id = 'icon-preview';
          iconPreview.src = iconLink;
          iconPreview.alt = 'Icon Vorschau';
          iconPreview.style.width = '50px';
          iconPreview.style.height = '50px';
          iconPreview.style.objectFit = 'cover';
          iconUploadContainer.appendChild(iconPreview);

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
                  iconPreview.src = `../../${currentDataFolder}/img/users/${newIconName}`;
                  modalJS.showModal(`Icon hochgeladen: ${newIconName}`);
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

      const otherActions = document.createElement('div');
      otherActions.classList.add('other-actions');

      const themedBtn = document.createElement('button');
      themedBtn.textContent = 'Theme für Anwender erstellen';
      themedBtn.type = 'button';
      themedBtn.disabled = isNewUser;
      themedBtn.addEventListener('click', async () => {
        if (isNewUser) return;

        if(themedBtn.textContent === 'Theme für Anwender erstellen') {
          try {
            const destinationPath = `${currentDataFolder}/theme/${user.user}.css`;
            const sourcePath = 'assets/css/users/default.css'

            await ipcRenderer.invoke('copy-file', {source: sourcePath, destination: destinationPath}).then(() => {
              //showThemeForm
            });

          } catch (error) {
            logdata(`Fehler beim Erstellen des Themes für Anwender "${user.name}".`, 'error');
            logdata(error, 'error');
          }
        }
        else {
          const destinationPath = `${currentDataFolder}/theme/${user.user}.css`;
          themeJS.showThemeForm(destinationPath);
        }
      });

      const sidebarBtn = document.createElement('button');
      sidebarBtn.textContent = 'Seitenfenster für Anwender erstellen';
      sidebarBtn.type = 'button';
      sidebarBtn.disabled = isNewUser;

      const overviewBtn = document.createElement('button');
      overviewBtn.textContent = 'Übersichtsseite für Anwender erstellen';
      overviewBtn.type = 'button';
      overviewBtn.disabled = isNewUser;

      if (!isNewUser) {
        const userId = user.user;

        // Erstelle die Dateienliste ohne DOM-Elemente
        const filesToCheck = [
          { path: `${currentDataFolder}/theme/${userId}.css`, editText: 'Theme für Anwender bearbeiten' },
          { path: `${currentDataFolder}/sidebar_${userId}.json`, editText: 'Seitenfenster für Anwender bearbeiten' },
          { path: `${currentDataFolder}/overview_${userId}.json`, editText: 'Übersichtsseite für Anwender bearbeiten' },
        ];

        // Überprüfe die Datei-Existenz
        ipcRenderer.invoke('check-file-existence', { files: filesToCheck }).then((results) => {
          // Verarbeite die Rückgabe und aktualisiere die Button-Texte
          results.forEach((result, index) => {
            if (result.exists) {
              if (index === 0) themedBtn.textContent = result.editText;
              if (index === 1) sidebarBtn.textContent = result.editText;
              if (index === 2) overviewBtn.textContent = result.editText;
            }
          });
        });
      }

      otherActions.appendChild(themedBtn);
      otherActions.appendChild(sidebarBtn);
      otherActions.appendChild(overviewBtn);
      editorForm.appendChild(otherActions);

    }).catch((error) => {
      logdata('Fehler beim Abrufen des Schemas:' + error, 'error');
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

    // Validierung
    if (!newUser.user || !newUser.name || !newUser.icon) {
      modalJS.showModal('Die Felder Benutzername, Name und Icon sind erforderlich.');
      return;
    }

    if (newUser.pin && !/^\d{4}$/.test(newUser.pin)) {
      modalJS.showModal('Die PIN muss 4-stellig sein.');
      return;
    }

    ipcRenderer.invoke('save-user', { newUser, existingUserId }).then(() => {
      modalJS.showModal('Anwender erfolgreich gespeichert.');
      editorJS.showStartPage();
    }).catch((error) => {
      logdata('Fehler beim Speichern des Anwenders: ' + error, 'error');
      modalJS.showModal('Fehler beim Speichern des Anwenders.');
    });
  }
}
