const usersJS = {

  showUserForm(user = null) {
    editorJS.showEditor(); // Zeige den Editor
    editorForm.innerHTML = ''; // Bestehendes Formular löschen

    const isNewUser = !user; // Unterscheide zwischen Neu und Bearbeiten

    // Überschrift hinzufügen
    const header = document.createElement('h3');
    header.textContent = isNewUser ? 'Neuer Anwender' : `Bearbeite: ${user?.name || ''}`;
    editorForm.appendChild(header);

    // Felder für den Benutzer erstellen
    const fields = [
      { id: 'user', label: 'Benutzername', value: user?.user || '', required: true, readonly: !isNewUser },
      { id: 'name', label: 'Name', value: user?.name || '', required: true },
      { id: 'icon', label: 'Icon (Dateiname)', value: user?.icon || '', required: true },
      { id: 'pin', label: 'PIN (4-stellig, optional)', value: user?.pin || '', pattern: '^\\d{4}$' },
    ];

    fields.forEach((field) => {
      const container = document.createElement('div');
      container.classList.add('form-field');

      const label = document.createElement('label');
      label.textContent = field.label;
      label.htmlFor = field.id;

      if (field.required) {
        const requiredSpan = document.createElement('span');
        requiredSpan.textContent = ' *';
        requiredSpan.classList.add('required-star');
        label.appendChild(requiredSpan);
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.id = field.id;
      input.name = field.id;
      input.value = field.value;
      input.required = field.required || false;

      if (field.readonly) {
        input.readOnly = true;
      }

      if (field.id === 'pin') {
        input.maxLength = 4;
        input.addEventListener('input', (event) => {
          event.target.value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        });
      }

      if (field.pattern) {
        input.pattern = field.pattern;
      }

      container.appendChild(label);
      container.appendChild(input);
      editorForm.appendChild(container);
    });


    // Datei-Upload für das Icon
    const iconUploadContainer = document.createElement('div');
    iconUploadContainer.classList.add('form-field', 'icon-upload-container');

    // Vorschau des Icons
    const iconPreview = document.createElement('img');
    iconPreview.id = 'icon-preview';
    iconPreview.src = user?.icon ? `path/to/icons/${user.icon}` : ''; // Falls ein Icon existiert
    iconPreview.alt = 'Icon Vorschau';
    iconPreview.style.width = '50px';
    iconPreview.style.height = '50px';
    iconPreview.style.objectFit = 'cover';
    iconPreview.style.marginRight = '10px';
    iconUploadContainer.appendChild(iconPreview);

    // Icon-Feld (readonly)
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.id = 'icon';
    iconInput.name = 'icon';
    iconInput.value = user?.icon || '';
    iconInput.readOnly = true;
    iconInput.style.flexGrow = '1';
    iconUploadContainer.appendChild(iconInput);

    // "Durchsuchen"-Button
    const iconUploadButton = document.createElement('button');
    iconUploadButton.textContent = 'Durchsuchen';
    iconUploadButton.type = 'button';
    iconUploadButton.addEventListener('click', () => {
      // Öffne Datei-Dialog
      const iconUploadInput = document.createElement('input');
      iconUploadInput.type = 'file';
      iconUploadInput.accept = '.jpg,.jpeg,.png,.svg,.gif,.webp';

      iconUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          ipcRenderer.invoke('upload-icon', file.path).then((newIconName) => {
            // Aktualisiere das Input-Feld
            iconInput.value = newIconName;

            // Aktualisiere die Vorschau
            iconPreview.src = `path/to/icons/${newIconName}`;
            iconPreview.alt = `Vorschau von ${newIconName}`;

            alert('Icon hochgeladen und Dateiname angepasst: ' + newIconName);
          });
        }
      });

      // Trigger Datei-Dialog
      iconUploadInput.click();
    });

    iconUploadContainer.appendChild(iconUploadButton);
    editorForm.appendChild(iconUploadContainer);


    // Speichern- und Abbrechen-Buttons
    const actions = document.createElement('div');
    actions.classList.add('actions');

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Speichern';
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => usersJS.saveUserData(user?.user));

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', editorJS.showStartPage);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    editorForm.appendChild(actions);
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

    ipcRenderer.send('log-message', 'Userdaten: ' + JSON.stringify(newUser, null, 2));

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
      ipcRenderer.send('log-message', 'Anwenderliste wird aktualisiert.');
      editorJS.showStartPage();
    }).catch((error) => {
      console.error('Fehler beim Speichern des Anwenders:', error);
      alert('Fehler beim Speichern des Anwenders.');
    });
  }
}
