const themeJS = {
  checkAndCopyDefaultTheme() {
    const defaultThemePath = `${currentDataFolder}/theme/default.css`;
    const assetsThemePath = 'assets/css/users/default.css';

    logdata(defaultThemePath);
    ipcRenderer
      .invoke('check-file-existence', { files: [{ path: defaultThemePath }] })
      .then((results) => {
        const exists = results[0]?.exists;

        if (!exists) {
          logdata('default.css existiert nicht. Kopiere default.css...');
          ipcRenderer
            .invoke('copy-file', { source: assetsThemePath, destination: defaultThemePath })
            .then(() => {
              logdata(`default.css wurde erfolgreich von "${assetsThemePath}" nach "${defaultThemePath}" kopiert.`);
              this.showThemeForm(defaultThemePath); // Formular anzeigen
            })
            .catch((error) => {
              logdata('Fehler beim Kopieren der default.css:' + error, 'error');
            });
        } else {
          logdata('default.css existiert bereits.');
          this.showThemeForm(defaultThemePath); // Formular anzeigen
        }
      })
      .catch((error) => {
        logdata('Fehler beim Überprüfen von default.css:' + error, 'error');
      });
  },

  generateFormField(key, value = '') {
    const previewImagePath = `img/theme/${key.replace('--', '')}.jpg`;

    const formFieldContainer = document.createElement('div');
    formFieldContainer.classList.add('theme-form-field'); // Flex-Container für Vorschaubild und Eingabe

    // Vorschaubild erstellen
    const previewImage = document.createElement('img');
    previewImage.classList.add('theme-preview');
    previewImage.src = previewImagePath;
    previewImage.alt = `${key} Vorschau`;
    previewImage.onerror = () => (previewImage.style.display = 'none');
    previewImage.addEventListener('click', () => {
      const enlargedImage = document.createElement('img');
      enlargedImage.src = previewImage.src;
      enlargedImage.alt = 'Große Vorschau';
      modalJS.showModal(enlargedImage);
    });

    formFieldContainer.appendChild(previewImage); // Vorschaubild zuerst hinzufügen

    // Feldcontainer für Label und Input
    const fieldWrapper = document.createElement('div');
    fieldWrapper.classList.add('field-wrapper');

    // Label hinzufügen
    const label = document.createElement('label');
    label.textContent = key;
    fieldWrapper.appendChild(label);

    // Eingabefeld hinzufügen
    const input = document.createElement('input');
    input.type = 'text';
    input.name = key;
    input.value = value;
    input.classList.add('theme-input');
    fieldWrapper.appendChild(input);

    // Feld-Wrapper in den Container hinzufügen
    formFieldContainer.appendChild(fieldWrapper);

    // Formularfeld ins Formular einfügen
    editorForm.appendChild(formFieldContainer);
  },

  async showThemeForm(filePath) {
    try {
      const content = await ipcRenderer.invoke('read-file', filePath);
      const parsedCSS = this.parseCSSVariables(content);

      editorJS.showEditor();
      editorForm.innerHTML = '';

      const header = document.createElement('h3');
      header.textContent = `Bearbeite Theme: ${filePath}`;
      editorForm.appendChild(header);

      // Formularfelder generieren
      Object.keys(parsedCSS).forEach((key) => {
        this.generateFormField(key, parsedCSS[key]);
      });

      // Speichern- und Abbrechen-Buttons
      const actions = document.createElement('div');
      actions.classList.add('actions');

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Speichern';
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', () =>  this.saveTheme(filePath));

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', editorJS.showStartPage);

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      editorForm.appendChild(actions);

    } catch (error) {
      console.error('Fehler beim Laden des Themes:', error);
    }
  },

  parseCSSVariables(cssContent) {
    const regex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
    const variables = {};
    let match;

    while ((match = regex.exec(cssContent)) !== null) {
      variables[`--${match[1]}`] = match[2].trim();
    }

    return variables;
  },

  saveTheme(filePath) {
    const formContainer = document.querySelector('#editor-form');
    const inputs = formContainer.querySelectorAll('.theme-input');
    const newCSSContent = Array.from(inputs)
      .map((input) => `${input.name}: ${input.value};`)
      .join('\n');

    const finalCSSContent = `:root {\n${newCSSContent}\n}`;

    ipcRenderer
      .invoke('write-file', { path: filePath, content: finalCSSContent })
      .then(() => {
        modalJS.showModal('Theme wurde erfolgreich gespeichert.');
        editorJS.showStartPage();
      })
      .catch((error) => {
        console.error('Fehler beim Speichern des Themes:', error);
      });
  },
};
