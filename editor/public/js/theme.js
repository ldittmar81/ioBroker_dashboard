const themeJS = {
  checkAndCopyDefaultTheme() {
    const defaultThemePath = `${currentDataFolder}/theme/default.css`;
    const assetsThemePath = 'assets/css/users/default.css';

    logdata(defaultThemePath);
    ipcRenderer
      .invoke('check-file-existence', defaultThemePath)
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
    formFieldContainer.classList.add('theme-form-field');

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

    formFieldContainer.appendChild(previewImage);

    const fieldWrapper = document.createElement('div');
    fieldWrapper.classList.add('field-wrapper');

    if (value.startsWith('linear-gradient')) {
      const gradientWrapper = document.createElement('div');
      gradientWrapper.classList.add('gradient-wrapper');

      const directionValue = this.extractGradientPart(value, 1);
      const color1Value = this.extractGradientColor(value, 2);
      const color2Value = this.extractGradientColor(value, 3);

      const label = document.createElement('label');
      label.textContent = key;
      fieldWrapper.appendChild(label);

      // Dropdown für Gradientenrichtung
      const directionDropdown = document.createElement('select');
      directionDropdown.classList.add('gradient-direction');
      ['to bottom', 'to right', 'to top', 'to left'].forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === directionValue) opt.selected = true;
        directionDropdown.appendChild(opt);
      });

      // Colorpicker für die erste Farbe
      const color1Picker = document.createElement('input');
      color1Picker.type = 'color';
      color1Picker.classList.add('gradient-color');
      color1Picker.value = color1Value;

      // Colorpicker für die zweite Farbe
      const color2Picker = document.createElement('input');
      color2Picker.type = 'color';
      color2Picker.classList.add('gradient-color');
      color2Picker.value = color2Value;

      // Vorschau des Gradienten
      const gradientPreview = document.createElement('div');
      gradientPreview.classList.add('gradient-preview');
      gradientPreview.style.background = value;

      // Events für Live-Update der Vorschau
      const updateGradient = () => {
        const newGradient = `linear-gradient(${directionDropdown.value}, ${color1Picker.value}, ${color2Picker.value})`;
        gradientPreview.style.background = newGradient;
        gradientInput.value = newGradient;
      };

      directionDropdown.addEventListener('change', updateGradient);
      color1Picker.addEventListener('input', updateGradient);
      color2Picker.addEventListener('input', updateGradient);

      // Elemente hinzufügen
      gradientWrapper.appendChild(directionDropdown);
      gradientWrapper.appendChild(color1Picker);
      gradientWrapper.appendChild(color2Picker);
      gradientWrapper.appendChild(gradientPreview);

      fieldWrapper.appendChild(gradientWrapper);

      // Input für den gesamten `linear-gradient`-String
      const gradientInput = document.createElement('input');
      gradientInput.type = 'text';
      gradientInput.name = key;
      gradientInput.classList.add('theme-input');
      gradientInput.value = value; // Initial den gesamten String setzen
      gradientInput.style.marginTop = '10px'; // Abstand vom oberen Wrapper
      gradientInput.addEventListener('input', () => {
        gradientPreview.style.background = gradientInput.value;

        // Versuche, neue Werte auf Dropdowns und Colorpicker anzuwenden
        const newDirection = this.extractGradientPart(gradientInput.value, 1);
        const newColor1 = this.extractGradientColor(gradientInput.value, 2);
        const newColor2 = this.extractGradientColor(gradientInput.value, 3);

        if (newDirection) directionDropdown.value = newDirection;
        if (newColor1) color1Picker.value = newColor1;
        if (newColor2) color2Picker.value = newColor2;
      });

      // Gradient-Input-Feld unter dem Wrapper hinzufügen
      fieldWrapper.appendChild(gradientInput);
    }
    else {
      // Standard-Eingabe und Colorpicker
      const label = document.createElement('label');
      label.textContent = key;
      fieldWrapper.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      input.name = key;
      input.value = value;
      input.classList.add('theme-input');
      fieldWrapper.appendChild(input);

      if (this.isValidColor(value)) {
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = value;
        colorPicker.classList.add('theme-color-picker');
        input.addEventListener('input', () => {
          if (this.isValidColor(input.value)) {
            colorPicker.value = input.value;
          }
        });
        colorPicker.addEventListener('input', () => {
          input.value = colorPicker.value;
        });
        fieldWrapper.appendChild(colorPicker);
      }
    }

    formFieldContainer.appendChild(fieldWrapper);
    editorForm.appendChild(formFieldContainer);
  },

  extractGradientPart(value, partIndex) {
    const match = value.match(/linear-gradient\(([^,]+),\s*([^,]+),\s*([^,]+)\)/);
    return match ? match[partIndex].trim() : '';
  },

  extractGradientColor(value, colorIndex) {
    const match = value.match(/linear-gradient\(([^,]+),\s*([^,]+),\s*([^,]+)\)/);
    if (!match || !match[colorIndex]) return '#ffffff'; // Fallback auf Weiß, falls keine Farbe gefunden

    const color = match[colorIndex].trim();
    if (this.isValidColor(color)) {
      return this.rgbaToHex(color); // Konvertiere `rgba` zu Hex, wenn nötig
    }
    return '#ffffff'; // Fallback
  },


  isValidColor(color) {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
  },

  rgbaToHex(rgba) {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d\.]*)?\)/);
    if (!match) return '#ffffff'; // Fallback auf Weiß, falls die Farbe ungültig ist

    const [_, r, g, b] = match.map(Number); // Extrahiere RGB-Werte
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  },

  async showThemeForm(filePath) {
    try {
      const defaultCSSContent = await ipcRenderer.invoke('read-file', 'assets/css/users/default.css'); // Referenz-Default
      const targetCSSContent = await ipcRenderer.invoke('read-file', filePath); // Ziel-CSS

      const defaultVariables = this.parseCSSVariables(defaultCSSContent);
      const targetVariables = this.parseCSSVariables(targetCSSContent);

      // Fehlende Variablen aus `default.css` ergänzen
      const mergedVariables = { ...defaultVariables, ...targetVariables };

      editorJS.showEditor();
      editorForm.innerHTML = '';

      const header = document.createElement('h3');
      header.textContent = `Bearbeite Theme: ${filePath}`;
      editorForm.appendChild(header);

      // Formularfelder generieren
      Object.keys(defaultVariables).forEach((key) => {
        this.generateFormField(key, mergedVariables[key]); // Merged-Werte verwenden
      });

      // Speichern- und Abbrechen-Buttons
      const actions = document.createElement('div');
      actions.classList.add('actions');

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Speichern';
      saveBtn.type = 'button';
      saveBtn.addEventListener('click', () => this.saveTheme(filePath, defaultVariables)); // Default-Referenz übergeben

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Abbrechen';
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', editorJS.showStartPage);

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      editorForm.appendChild(actions);
    } catch (error) {
      logdata('Fehler beim Laden des Themes:' + error, 'error');
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

  saveTheme(filePath, defaultVariables) {

    const formContainer = document.querySelector('#editor-form');
    const inputs = formContainer.querySelectorAll('.theme-input');

    // Nur Variablen aus der `default.css` speichern
    const filteredCSSContent = Array.from(inputs)
      .filter((input) => Object.keys(defaultVariables).includes(input.name))
      .map((input) => `${input.name}: ${input.value};`)
      .join('\n');

    const finalCSSContent = `:root {\n${filteredCSSContent}\n}`;

    ipcRenderer
      .invoke('write-file', { filePath, content: finalCSSContent })
      .then(() => {
        modalJS.showModal('Theme wurde erfolgreich gespeichert.');
        editorJS.showStartPage();
      })
      .catch((error) => {
        logdata('Fehler beim Speichern des Themes: ' + error, 'error');
      });
  }
};
