/**
 * Das Modul fieldsForDevicesJS stellt Funktionen bereit, um verschiedene
 * Bedien- und Anzeigeelemente (Controls) für Geräte zu erstellen und zu verarbeiten.
 *
 * - Beispiele für Controls: Button, Toggle (Boolean), Textfeld, Zahleneingabe/Slider,
 *   Farbauswahl, Dropdown (Liste), und eine Liste von Farbauswahlen.
 * - Die Funktionen berücksichtigen u. a. Schreibrechte (`canWrite`), erlaubte Zustände
 *   (`control.allowed`) und senden bei Änderungen Kommandos an ioBroker.
 *
 * @namespace fieldsForDevicesJS
 */
const fieldsForDevicesJS = {

  /**
   * @typedef {Object} DeviceControl
   * @property {string} id - Die State-ID, die verändert werden soll (z. B. "alias.0.lampe.power").
   * @property {string} [function] - Anzeige- oder Funktionsname (z. B. "Lampe").
   *   Wird u. a. für Beschriftungen oder Labels verwendet.
   * @property {string} [allowed] - Eine State-ID, die angibt, ob die Aktion erlaubt ist (z. B. "alias.0.lampe.isEnabled").
   *   Wenn diese ID auf `true` steht, ist das Control aktiv, sonst deaktiviert.
   * @property {boolean|string} [sendValue] - Der Wert, der beim Einschalten/Togglen (z. B. Button oder Boolean-Control) geschickt wird.
   * @property {boolean|string} [sendValueOff] - Der Wert, der beim Ausschalten eines Boolean-Controls gesendet wird (z. B. `false`).
   * @property {string} [inputField] - Falls das Control ein HTML-Eingabefeld besitzt (z. B. `<input>`),
   *   kann hier ein Name (`name`-Attribut) hinterlegt werden, z. B. "myInputField".
   * @property {string} [labelOn] - Beim Boolean/Togglen: Beschriftung im "On"-Zustand.
   * @property {string} [labelOff] - Beim Boolean/Togglen: Beschriftung im "Off"-Zustand.
   * @property {number} [min] - Für Number- oder ColorList-Controls: Untergrenze (z. B. für Slider).
   * @property {number} [max] - Für Number- oder ColorList-Controls: Obergrenze (z. B. für Slider).
   * @property {number} [step] - Für Number-Controls: Schrittweite (z. B. 1, 0.5 usw.).
   * @property {string} [unit] - Für Number-/Slider-Controls: Einheit, die nach dem Wert angezeigt wird (z. B. "°C").
   * @property {boolean} [json] - Speziell für ColorList-Controls: Wenn true, wird das Farb-Array als JSON gespeichert/gelesen.
   * @property {string} [separator] - Speziell für ColorList- oder andere Listen-Controls: Trennzeichen (z. B. ",").
   * @property {string[]} [values] - Für Listen-Controls (Dropdown): Ein Array von "Label:Wert"-Strings,
   *   das in die `<option>`-Elemente übernommen wird (z. B. `["Aus:0","An:1"]`).
   */

  /**
   * Erstellt einen Button-Control und fügt ihn zum `container` hinzu.
   * - Der Button kann wahlweise einen Text (z. B. `control.function`) anzeigen.
   * - Durch `control.allowed` kann der Button nur klickbar sein,
   *   wenn der zugehörige Zustand `true` ist.
   * - Beim Klicken wird der Button im UI getoggelt (Klasse `.active`).
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Der Container, in den der Button eingefügt wird.
   * @param {DeviceControl} control - Das Control-Objekt mit Feldern wie `id`, `function`, `sendValue`, `allowed`, etc.
   * @param {boolean} canWrite - Gibt an, ob Schreibrechte vorhanden sind.
   * @returns {void}
   */
  addButtonControl(container, control, canWrite) {
    const button = document.createElement('button');
    button.classList.add('control-button');
    button.textContent = control.function || 'Button';
    button.dataset.id = control.id;
    button.dataset.sendValue = control.sendValue || true;

    if (control.inputField) {
      button.name = control.inputField;
    }

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }

    // Button nur klickbar, wenn Schreibrechte und "allowed" == true
    button.disabled = !canWrite || !allowedToChange;

    if (canWrite) {
      button.onclick = () => {
        // Button bei Klick ein-/aus-Status toggeln
        button.classList.toggle('active');
      };
    }

    container.appendChild(button);
  },

  /**
   * Wertet einen Button-Control nach einer Aktion aus und sendet ggf. einen Befehl an ioBroker.
   * - Wenn der Button die Klasse `.active` hat, wird `control.sendValue` gesendet,
   *   sofern es sich vom alten Wert unterscheidet.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element, in dem sich der Button befindet.
   * @param {DeviceControl} control - Das Control-Objekt mit ID, `sendValue`, etc.
   * @returns {void}
   */
  processButtonControl(overlayContent, control) {
    const button = overlayContent.querySelector(`.control-button[data-id="${control.id}"]`);
    if (button && button.classList.contains('active')) {
      const valueToSend = control.sendValue || true;
      const oldValue = ioBrokerStates[control.id]?.val;
      if (valueToSend !== oldValue) {
        ioBrokerJS.sendCommand(control.id, valueToSend);
      }
    }
  },

  /**
   * Erstellt einen Boolean-Control (Toggle-Switch) und fügt ihn zum `container` hinzu.
   * - Zeigt optional den Funktionsnamen (`control.function`) an.
   * - Nutzt ein `<input type="checkbox">` für die Umsetzung des Toggles.
   * - Wenn `control.allowed` definiert ist, wird das Toggle nur aktiv, wenn der Zustand `true` ist.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Der Container, in den das Boolean-Control eingefügt wird.
   * @param {DeviceControl} control - Das Control-Objekt (Enthält Felder wie `id`, `function`, `labelOn`, `labelOff`, etc.).
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addBooleanControl(container, control, canWrite) {
    const booleanContainer = document.createElement('div');
    booleanContainer.classList.add('control-boolean');

    // Optionaler Funktionsname
    const functionLabel = document.createElement('div');
    functionLabel.classList.add('function-label');
    functionLabel.textContent = control.function || 'Switch';
    booleanContainer.appendChild(functionLabel);

    // Toggle-Switch
    const toggleWrapper = document.createElement('label');
    toggleWrapper.classList.add('toggle-switch');

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    if (control.inputField) {
      toggleInput.name = control.inputField;
    }
    toggleInput.classList.add('control-toggle');
    toggleInput.dataset.id = control.id;
    toggleInput.dataset.sendValue = control.sendValue || true;
    toggleInput.dataset.sendValueOff = control.sendValueOff || false;
    toggleInput.checked = formatJS.isTrue(ioBrokerStates[control.id]?.val);

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }
    toggleInput.disabled = !canWrite || !allowedToChange;

    // Schieber
    const sliderSpan = document.createElement('span');
    sliderSpan.classList.add('extra-slider');
    if (!canWrite || !allowedToChange) {
      sliderSpan.classList.add('disabled');
    }

    // Anzeigen für On/Off
    const labelOn = control.labelOn || '';
    const labelOff = control.labelOff || '';
    const onOffLabels = document.createElement('span');
    onOffLabels.classList.add('on-off-labels');
    onOffLabels.dataset.on = labelOn;
    onOffLabels.dataset.off = labelOff;
    sliderSpan.appendChild(onOffLabels);

    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(sliderSpan);

    booleanContainer.appendChild(toggleWrapper);
    container.appendChild(booleanContainer);
  },

  /**
   * Wertet ein Boolean-Control (Toggle) aus und sendet ggf. einen Befehl an ioBroker.
   * - Ermittelt, ob der Switch checked ist und sendet `control.sendValue` oder `control.sendValueOff`.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element, in dem sich das Toggle befindet.
   * @param {DeviceControl} control - Objekt mit ID, `sendValue`, `sendValueOff`.
   * @returns {void}
   */
  processBooleanControl(overlayContent, control) {
    const toggleSwitch = overlayContent.querySelector(`.control-toggle[data-id="${control.id}"]`);
    if (toggleSwitch) {
      const valueToSend = toggleSwitch.checked
        ? (control.sendValue || true)
        : (control.sendValueOff || false);
      const oldValue = ioBrokerStates[control.id]?.val;
      if (valueToSend !== oldValue) {
        ioBrokerJS.sendCommand(control.id, valueToSend);
      }
    }
  },

  /**
   * Erstellt ein Text-Control (Eingabefeld) und fügt es zum `container` hinzu.
   * - Zeigt optional den Namen (`control.function`) vor dem Feld an.
   * - Setzt den aktuellen Wert aus `ioBrokerStates`.
   * - `control.allowed` kann das Schreibrecht zusätzlich einschränken.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Ziel-Container.
   * @param {DeviceControl} control - Control-Objekt (enthält u. a. `id`, `function`, `allowed`).
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addTextControl(container, control, canWrite) {
    const label = document.createElement('label');
    label.classList.add('control-label');
    label.textContent = (control.function || 'Text') + ':';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.classList.add('control-input');
    inputField.dataset.id = control.id;
    if (control.inputField) {
      inputField.name = control.inputField;
    }

    inputField.value = ioBrokerStates[control.id]?.val || '';

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }

    inputField.disabled = !canWrite || !allowedToChange;

    label.appendChild(inputField);
    container.appendChild(label);
  },

  /**
   * Liest das Text-Control aus und sendet den Wert an ioBroker, wenn er sich geändert hat.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element.
   * @param {DeviceControl} control - Control mit `id`.
   * @returns {void}
   */
  processTextControl(overlayContent, control) {
    const inputField = overlayContent.querySelector(`.control-input[data-id="${control.id}"]`);
    if (inputField) {
      const valueToSend = inputField.value;
      const oldValue = ioBrokerStates[control.id]?.val;
      if (valueToSend !== oldValue) {
        ioBrokerJS.sendCommand(control.id, valueToSend);
      }
    }
  },

  /**
   * Erstellt ein Number-Control. Dies kann entweder ein normales `<input type="number">`
   * oder ein `<input type="range">` (Slider) sein, wenn `control.min` oder `control.max` gesetzt sind.
   *
   * - Zeigt optional den Namen (`control.function`) und den aktuellen Wert an.
   * - `control.step` kann einen Schrittwert für den Slider festlegen.
   * - Wenn es ein Slider ist, wird bei Änderung der Wert angezeigt.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Ziel-Container.
   * @param {DeviceControl} control - Control-Objekt mit Feldern wie `id`, `function`, `min`, `max`, `step`.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addNumberControl(container, control, canWrite) {
    const label = document.createElement('label');
    label.classList.add('control-label');
    label.textContent = (control.function || 'Number') + ':';

    const inputType = (control.min !== undefined || control.max !== undefined) ? 'range' : 'number';

    const inputField = document.createElement('input');
    inputField.type = inputType;
    inputField.classList.add('control-input');
    inputField.dataset.id = control.id;
    if (control.inputField) {
      inputField.name = control.inputField;
    }

    // Min/Max/Step anwenden, falls definiert
    if (control.min !== undefined) {
      inputField.min = control.min;
    }
    if (control.max !== undefined) {
      inputField.max = control.max;
    }
    if (control.step !== undefined) {
      inputField.step = control.step;
    }

    const currentValue = ioBrokerStates[control.id]?.val;
    inputField.value = currentValue !== undefined ? currentValue : '0';

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }
    inputField.disabled = !canWrite || !allowedToChange;

    label.appendChild(inputField);
    container.appendChild(label);

    // Wenn Slider, zeige den aktuellen Wert darunter an
    if (inputType === 'range') {
      const valueDisplay = document.createElement('div');
      valueDisplay.classList.add('control-value-display');
      valueDisplay.textContent = currentValue !== undefined ? currentValue : '';
      if (control.unit) {
        valueDisplay.textContent += ' ' + control.unit;
      }

      inputField.addEventListener('input', () => {
        valueDisplay.textContent = inputField.value;
        if (control.unit) {
          valueDisplay.textContent += ' ' + control.unit;
        }
      });

      container.appendChild(valueDisplay);
    }
  },

  /**
   * Liest das Number-Control aus und sendet den neuen Wert an ioBroker, falls er sich geändert hat.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element.
   * @param {DeviceControl} control - Control mit `id` und ggf. `unit`.
   * @returns {void}
   */
  processNumberControl(overlayContent, control) {
    const inputField = overlayContent.querySelector(`.control-input[data-id="${control.id}"]`);
    if (inputField) {
      let valueToSend = inputField.value;
      if (valueToSend !== '') {
        const oldValue = ioBrokerStates[control.id]?.val;
        if (valueToSend !== oldValue) {
          ioBrokerJS.sendCommand(control.id, valueToSend);
        }
      }
    }
  },

  /**
   * Erstellt ein Color-Control (Farbwähler) (`<input type="color">`).
   * - `control.function` bestimmt die Beschriftung.
   * - Der aktuelle Wert wird aus `ioBrokerStates` gelesen oder auf weiß (#ffffff) gesetzt.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Ziel-Container.
   * @param {DeviceControl} control - Control-Objekt mit Feldern wie `id`, `function`, `allowed`.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addColorControl(container, control, canWrite) {
    const label = document.createElement('label');
    label.classList.add('control-label');
    label.textContent = (control.function || 'Color') + ':';

    const inputField = document.createElement('input');
    inputField.type = 'color';
    inputField.classList.add('control-input');
    inputField.dataset.id = control.id;
    if (control.inputField) {
      inputField.name = control.inputField;
    }

    const currentValue = ioBrokerStates[control.id]?.val;
    inputField.value = currentValue !== undefined ? currentValue : '#ffffff';

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }
    inputField.disabled = !canWrite || !allowedToChange;

    label.appendChild(inputField);
    container.appendChild(label);
  },

  /**
   * Liest das Color-Control aus und sendet den neuen Wert an ioBroker, falls er sich geändert hat.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element.
   * @param {DeviceControl} control - Control mit `id`.
   * @returns {void}
   */
  processColorControl(overlayContent, control) {
    const inputField = overlayContent.querySelector(`.control-input[data-id="${control.id}"]`);
    if (inputField) {
      const valueToSend = inputField.value;
      const oldValue = ioBrokerStates[control.id]?.val;
      if (valueToSend !== oldValue) {
        ioBrokerJS.sendCommand(control.id, valueToSend);
      }
    }
  },

  /**
   * Erstellt ein Listen-Control (Dropdown) mit Optionswerten.
   * - Zeigt ggf. `Bitte wählen...` als erste Option.
   * - Wenn `control.values` definiert ist, werden diese ins Dropdown übernommen
   *   (Format "Anzeigetext:Wert").
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Ziel-Container.
   * @param {DeviceControl} control - Control (enthält u. a. `id`, `values`, `function`, `allowed`).
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addListControl(container, control, canWrite) {
    const label = document.createElement('label');
    label.classList.add('control-label');
    label.textContent = (control.function || 'Select') + ':';

    const selectField = document.createElement('select');
    selectField.classList.add('control-select');
    selectField.dataset.id = control.id;
    if (control.inputField) {
      selectField.name = control.inputField;
    }

    // Platzhalter-Option
    const selectOption = document.createElement('option');
    selectOption.value = "";
    selectOption.textContent = "Bitte wählen...";
    selectField.appendChild(selectOption);

    // Werte ins Dropdown
    if (Array.isArray(control.values)) {
      control.values.forEach(optionStr => {
        const [labelText, valueText] = optionStr.split(':');
        const option = document.createElement('option');
        option.value = valueText !== undefined ? valueText : labelText;
        option.textContent = labelText;
        selectField.appendChild(option);
      });
    }

    // Aktuellen Wert setzen
    const currentValue = ioBrokerStates[control.id]?.val;
    if (currentValue !== undefined) {
      selectField.value = currentValue;
    }

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }
    selectField.disabled = !canWrite || !allowedToChange;

    label.appendChild(selectField);
    container.appendChild(label);
  },

  /**
   * Liest das Listen-Control (Dropdown) aus und sendet den neuen Wert an ioBroker.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element.
   * @param {DeviceControl} control - Control mit `id`.
   * @returns {void}
   */
  processListControl(overlayContent, control) {
    const selectField = overlayContent.querySelector(`.control-select[data-id="${control.id}"]`);
    if (selectField) {
      const valueToSend = selectField.value;
      const oldValue = ioBrokerStates[control.id]?.val;
      if (valueToSend !== oldValue) {
        ioBrokerJS.sendCommand(control.id, valueToSend);
      }
    }
  },

  /**
   * Erstellt ein Control, um mehrere Farben auszuwählen (ColorList).
   * - Ermöglicht das Hinzufügen und Entfernen einzelner Farben.
   * - Mindest- und Maximalanzahl von Farben kann über `control.min`/`control.max` gesteuert werden.
   * - Kann wahlweise JSON (`control.json = true`) oder einen Separator (z.B. `,`) verwenden.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} container - Ziel-Container.
   * @param {DeviceControl} control - Control mit Feldern wie `id`, `function`, `min`, `max`, `json`, `separator`.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addColorListControl(container, control, canWrite) {
    const label = document.createElement('label');
    label.classList.add('control-label');
    label.textContent = (control.function || 'Color List') + ':';

    const colorListContainer = document.createElement('div');
    colorListContainer.classList.add('color-list-container');
    colorListContainer.dataset.id = control.id;

    const minColors = control.min || 0;
    const maxColors = control.max || 2;

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.classList.add('color-list-add');
    addButton.textContent = 'Farbe hinzufügen';
    addButton.onclick = () => {
      addColorInput();
    };

    function updateAddButtonState() {
      addButton.disabled = (colorListContainer.childElementCount >= maxColors) || !canWrite;
    }

    /**
     * Fügt ein `<input type="color">` hinzu.
     *
     * @param {string} [value] - Initialer Hex-Farbwert, falls vorhanden.
     * @param {boolean} [isDeletable=true] - Ob die Farbzeile löschbar sein darf.
     */
    function addColorInput(value, isDeletable = true) {
      if (colorListContainer.childElementCount >= maxColors) return;

      const colorInputWrapper = document.createElement('div');
      colorInputWrapper.classList.add('color-input-wrapper');

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.classList.add('color-list-input');
      colorInput.value = value || '#ffffff';
      colorInput.disabled = !canWrite;

      colorInputWrapper.appendChild(colorInput);

      if (isDeletable && canWrite) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('color-list-remove');
        removeButton.textContent = 'X';
        removeButton.onclick = () => {
          colorListContainer.removeChild(colorInputWrapper);
          updateAddButtonState();
        };
        colorInputWrapper.appendChild(removeButton);
      }

      colorListContainer.appendChild(colorInputWrapper);
      updateAddButtonState();
    }

    // Aktuellen Wert aus `ioBrokerStates` lesen
    const currentValue = ioBrokerStates[control.id]?.val || '';
    let colorsArray = [];

    // Werte aus der aktuellen Vorgabe übernehmen
    if (currentValue) {
      if (control.json) {
        try {
          colorsArray = JSON.parse(currentValue);
        } catch (e) {
          console.error('Invalid JSON in colorList control value', currentValue);
          colorsArray = [];
        }
      } else {
        const separator = control.separator || ',';
        colorsArray = currentValue.split(separator);
      }
    }

    // Existierende Farben hinzufügen
    colorsArray.forEach((colorValue, index) => {
      const isDeletable = index >= minColors;
      addColorInput(colorValue, isDeletable);
    });

    // Fehlende Farben bis zur Mindestanzahl hinzufügen
    while (colorListContainer.childElementCount < minColors) {
      addColorInput('#ffffff', false);
    }

    updateAddButtonState();

    let allowedToChange = true;
    if (control.allowed) {
      allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
    }
    if (!allowedToChange) {
      // Wenn nicht erlaubt, alle Eingaben deaktivieren
      const inputs = colorListContainer.querySelectorAll('input, button');
      inputs.forEach(input => input.disabled = true);
      addButton.disabled = true;
    }

    label.appendChild(colorListContainer);
    label.appendChild(addButton);
    container.appendChild(label);
  },

  /**
   * Liest das ColorList-Control aus und sendet die ausgewählten Farben an ioBroker.
   * - Kann entweder JSON oder einen Separator (z. B. `,`) verwenden.
   * - Prüft, ob die Mindestanzahl von Farben (`control.min`) eingehalten wird.
   *
   * @function
   * @memberof fieldsForDevicesJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element.
   * @param {DeviceControl} control - Control-Objekt mit Feldern wie `id`, `json`, `separator`, `min`.
   * @returns {void}
   */
  processColorListControl(overlayContent, control) {
    const colorListContainer = overlayContent.querySelector(`.color-list-container[data-id="${control.id}"]`);
    if (colorListContainer) {
      const colorInputs = colorListContainer.querySelectorAll('.color-list-input');
      const colorsArray = Array.from(colorInputs).map(input => input.value);

      const minColors = control.min || 0;
      if (colorsArray.length < minColors) {
        alert(`Bitte wählen Sie mindestens ${minColors} Farben aus.`);
        return;
      }

      let valueToSend;
      if (control.json) {
        valueToSend = JSON.stringify(colorsArray);
      } else {
        const separator = control.separator || ',';
        valueToSend = colorsArray.join(separator);
      }

      const oldValue = ioBrokerStates[control.id]?.val;
      if (valueToSend !== oldValue) {
        ioBrokerJS.sendCommand(control.id, valueToSend);
      }
    }
  }
};
