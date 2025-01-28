const usersJS = {
  showUserForm(user = null) {
    editorJS.showEditor(); // Zeige den Editor
    editorForm.innerHTML = ''; // Bestehendes Formular löschen

    const isNewUser = !user; // Unterscheide zwischen Neu und Bearbeiten

    // Überschrift hinzufügen
    const headerText = isNewUser ? 'Neuer Anwender' : `Bearbeite: ${user?.name || ''}`;
    editorForm.appendChild(editorJS.createHeader(headerText));

    // Hole das Schema
    ipcRenderer
      .invoke('get-schema', 'users.schema.json')
      .then((fieldSchema) => {
        if (!fieldSchema?.items?.properties) {
          logdata('Fehler beim Laden des Schemas.', 'error');
          return;
        }

        const fields = fieldSchema.items.properties;

        // Iteriere über die Felder im Schema
        Object.keys(fields).forEach((key) => {
          const fieldSchema = fields[key];
          const value = user?.[key] || '';

          // Spezielle Logik für bestimmte Felder
         if (key === 'icon') {
            this.createIconField(fieldSchema, key, value, user);
          } else {
            // Generisches Formularfeld
            const field = editorJS.generateFormField('users', '', key, fieldSchema, value);
            if (field) editorForm.appendChild(field);
          }
        });

        // Speichern- und Abbrechen-Buttons hinzufügen
        const actions = editorJS.createButtons(() => this.saveUserData(user?.user));
        editorForm.appendChild(actions);

        // Weitere Aktionen (Theme, Sidebar, Übersicht)
        const otherActions = this.createAdditionalUserActions(user, isNewUser);
        editorForm.appendChild(otherActions);
      })
      .catch((error) => {
        logdata('Fehler beim Abrufen des Schemas: ' + error, 'error');
      });
  },

  createIconField(fieldSchema, key, value, user) {
    const container = editorJS.createFormFieldContainer(fieldSchema, key);

    // Vorschau-Bild
    const previewLink = user?.icon
      ? `../../${currentDataFolder}/${fieldSchema.$comment}/${user.icon}`
      : 'img/no-pic.webp';
    const preview = document.createElement('img');
    preview.src = previewLink;
    preview.alt = 'Icon Vorschau';
    preview.style.width = '50px';
    preview.style.height = '50px';
    preview.style.objectFit = 'cover';

    // Readonly-Feld
    const input = document.createElement('input');
    input.type = 'text';
    input.id = key;
    input.name = key;
    input.value = value;
    input.readOnly = true;

    // Durchsuchen-Button
    const uploadButton = document.createElement('button');
    uploadButton.textContent = 'Durchsuchen';
    uploadButton.type = 'button';
    uploadButton.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.jpg,.jpeg,.png,.svg,.gif,.webp';
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          ipcRenderer.invoke('upload-icon', file.path, fieldSchema.$comment).then((newIconName) => {
            input.value = newIconName;
            preview.src = `../../${currentDataFolder}/${fieldSchema.$comment}/${newIconName}`;
          });
        }
      });
      fileInput.click();
    });

    // Container aufbauen
    const uploadContainer = document.createElement('div');
    uploadContainer.classList.add('icon-upload-container');
    uploadContainer.appendChild(preview);
    uploadContainer.appendChild(input);
    uploadContainer.appendChild(uploadButton);
    container.appendChild(uploadContainer);

    editorForm.appendChild(container);
  },

  createAdditionalUserActions(user, isNewUser) {
    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('other-actions');

    const userId = user?.user;
    const actions = [
      { text: 'Theme für Anwender erstellen', file: `theme/${userId}.css` },
      { text: 'Seitenfenster für Anwender erstellen', file: `sidebar_${userId}.json` },
      { text: 'Übersichtsseite für Anwender erstellen', file: `overview_${userId}.json` },
    ];

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.textContent = action.text;
      button.type = 'button';
      button.disabled = isNewUser;

      if (!isNewUser) {
        ipcRenderer.invoke('check-file-existence', currentDataFolder + '/' + action.file).then((exists) => {
          logdata(`File ${action.file} exists: ${JSON.stringify(exists)}`, 'info');
          button.textContent = exists
            ? action.text.replace('erstellen', 'bearbeiten')
            : action.text;
        });

        button.addEventListener('click', () => {
          const bearbeiten = button.textContent.includes('bearbeiten');
          if (button.textContent.startsWith('Theme')) {
            if (bearbeiten) {
              // Öffne Editor
              const filePath = `${currentDataFolder}/${action.file}`;
              themeJS.showThemeForm(filePath);
            } else {
              const destinationPath = `${currentDataFolder}/theme/${user.user}.css`;
              const sourcePath = 'assets/css/users/default.css'
              ipcRenderer.invoke('copy-file', {source: sourcePath, destination: destinationPath}).then(() => {
                themeJS.showThemeForm(destinationPath);
              });
            }
          }
          else if (button.textContent.startsWith('Seitenfenster')) {
            if(bearbeiten){
              const filePath = `${currentDataFolder}/${action.file}`;
              ipcRenderer.invoke('read-file', filePath).then((fileData) => {
                const content = JSON.parse(fileData);
                return ipcRenderer.invoke('get-schema', 'sidebar.schema.json').then((schema) => {
                  sidebarJS.showSidebarForm(content, schema, action.file);
                });
              })
            }
            else {
              const filePath = `${currentDataFolder}/sidebar_${user.user}.json`;
              const defaultSidebarContent = {
                clock: "default",
                openWeatherMap: {
                  enabled: false,
                  imageSet: 1,
                  imageType: "svg",
                  location: "",
                  apiKey: ""
                },
                ioBroker_ical: {
                  enabled: false,
                  calendars: []
                }
              };

              ipcRenderer
                .invoke('write-file', {
                  filePath,
                  content: JSON.stringify(defaultSidebarContent, null, 2),
                  reload: true
                })
                .then(() => {
                  return ipcRenderer.invoke('get-schema', 'sidebar.schema.json').then((schema) => {
                    sidebarJS.showSidebarForm(defaultSidebarContent, schema, `sidebar_${user.user}.json`);
                  });
                });
            }
          }
          else if (button.textContent.startsWith('Übersichtsseite')) {
            if(bearbeiten){
              const filePath = `${currentDataFolder}/${action.file}`;
              ipcRenderer.invoke('read-file', filePath).then((fileData) => {
                const content = JSON.parse(fileData);
                return ipcRenderer.invoke('get-schema', 'overview.schema.json').then((schema) => {
                  overviewJS.showOverviewForm(content, schema, action.file);
                });
              })
            }
            else {
              const filePath = `${currentDataFolder}/overview_${user.user}.json`;
              const defaultOverviewContent = {
                name: "Meine Übersicht",
                type: "overview",
                icon: "fa-home",
                content: [
                  {
                    category: "Beispiel-Kategorie",
                    devices: []
                  }
                ]
              };

              ipcRenderer
                .invoke('write-file', {
                  filePath,
                  content: JSON.stringify(defaultOverviewContent, null, 2),
                  reload: true
                })
                .then(() => {
                  return ipcRenderer.invoke('get-schema', 'overview.schema.json').then((schema) => {
                    overviewJS.showOverviewForm(defaultOverviewContent, schema, `overview_${user.user}.json`);
                  });
                });
            }
          }
        });
      }

      actionsContainer.appendChild(button);
    });

    return actionsContainer;
  },

  saveUserData(existingUserId = null) {
    const formData = new FormData(editorForm);
    const newUser = {};

    formData.forEach((value, key) => {
      if (key === 'pin' && value.trim() === '') return; // Überspringe leeres "pin"-Feld
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

    ipcRenderer
      .invoke('save-user', { newUser, existingUserId })
      .then(() => {
        modalJS.showModal('Anwender erfolgreich gespeichert.');
        editorJS.showStartPage();
      })
      .catch((error) => {
        logdata('Fehler beim Speichern des Anwenders: ' + error, 'error');
        modalJS.showModal('Fehler beim Speichern des Anwenders.');
      });
  },
};
