/**
 * Das Modul deviceWindowJS enthält Funktionen, um ein Fenster-Icon mit optionalem
 * Rollladen (Shutter) in einer Kachel darzustellen und zu steuern.
 *
 * - Der Fensterstatus (`device.state`) zeigt an, ob das Fenster geschlossen, gekippt
 *   oder offen ist (z. B. Werte 0,1,2).
 * - Ein optionaler Rollladen (`device.value` als Prozentwert 0–100) kann mit einem Klick gesteuert werden.
 *
 * @namespace deviceWindowJS
 */
const deviceWindowJS = {

  /**
   * @typedef {Object} WindowDeviceDefinition
   * @property {string} state - State-ID für den Fensterstatus (0 = zu, 1 = gekippt, 2 = offen).
   * @property {string} [value] - (Optional) State-ID für die Rollladenposition (0 = ganz oben/offen, 100 = ganz unten/geschlossen).
   */

  /**
   * Erstellt ein DOM-Element für das Fenster (inkl. Rollladen-Icon) und fügt es
   * in das übergebene `tileContent` ein.
   *
   * - Setzt `tileContent.dataset.id` und `tileContent.dataset.state`, um die IDs zu speichern.
   * - Erzeugt das `<div class="main-icon">`, in dem sich sowohl das Fenster-Icon
   *   (`.window-icon`) als auch (bei vorhandenem `device.value`) ein `.shutter`-Element befinden.
   * - Registriert die State-IDs über `ioBrokerJS.addPageId(...)`.
   * - Liest den aktuellen Rollladenstatus (`device.value`) und Fensterstatus (`device.state`)
   *   aus `ioBrokerStates` und aktualisiert die Darstellung (`updateWindowIcon`, `updateShutterPosition`).
   * - Bei Schreibrechten (`canWrite`) erlaubt ein Klick auf das Icon, den Rollladen
   *   zwischen 0% und 100% zu togglen.
   *
   * @function
   * @memberof deviceWindowJS
   * @param {HTMLElement} tileContent - Das Kachel-Element, in das das Fenster-Icon eingefügt wird.
   * @param {WindowDeviceDefinition} device - Objekt mit Fenster- und optionalem Rollladen-State.
   * @param {boolean} canWrite - Gibt an, ob der Nutzer Schreibrechte hat (wichtig für OnClick-Event).
   * @returns {void}
   */
  addWindowControls(tileContent, device, canWrite) {
    tileContent.dataset.id = device.value;
    tileContent.dataset.state = device.state;

    const mainIcon = document.createElement('div');
    mainIcon.classList.add('main-icon');
    mainIcon.dataset.id = device.value;

    // Wenn ein Rollladen vorhanden ist, erzeuge ein .shutter-Element
    if (device.value) {
      const shutter = document.createElement('div');
      shutter.classList.add('shutter');
      mainIcon.appendChild(shutter);
    }

    // Fenster-Icon selbst
    const windowIcon = document.createElement('div');
    windowIcon.classList.add('window-icon');
    mainIcon.appendChild(windowIcon);

    // Registriere State-IDs
    if (device.value) {
      ioBrokerJS.addPageId(device.value, '%');
    }
    ioBrokerJS.addPageId(device.state, '0,1,2');

    // Speichere Fenstersensor-ID
    if (device.state) {
      mainIcon.dataset.stateId = device.state;
    }

    // Initiale Darstellung
    deviceWindowJS.updateWindowIcon(mainIcon);
    if (device.value) {
      deviceWindowJS.updateShutterPosition(mainIcon);

      // Klick für Rollladen
      if (canWrite) {
        mainIcon.onclick = () => {
          const currentValue = ioBrokerStates[device.value]?.val || 0;
          const newValue = currentValue < 50 ? 100 : 0;
          ioBrokerJS.sendCommand(device.value, newValue);
        };
      }
    }

    tileContent.prepend(mainIcon);
  },

  /**
   * Aktualisiert das Fenster-Icon je nach Status-ID (0 = zu, 1 = gekippt, 2 = offen).
   *
   * - Sucht in `.window-icon` nach dem `mainIcon.dataset.stateId`.
   * - Vergleicht den Wert in `ioBrokerStates` und setzt
   *   ein entsprechendes Bild (`window_close.png`, `window_tilt.png`, `window_open.png`).
   * - Gekippt wird hier als 1, offen als 2 interpretiert.
   *
   * @function
   * @memberof deviceWindowJS
   * @param {HTMLDivElement} mainIcon - Das DOM-Element mit Klasse `main-icon`.
   * @returns {void}
   */
  updateWindowIcon(mainIcon) {
    const windowIcon = mainIcon.querySelector('.window-icon');
    const stateId = windowIcon.parentElement.dataset.stateId;
    const stateValue = stateId ? ioBrokerStates[stateId]?.val : null;

    let iconUrl;

    // Wir interpretieren: 2 (offen) oder true => fenster_open
    if (formatJS.isTrue(stateValue) || stateValue === 2 || stateValue === '2') {
      iconUrl = 'assets/img/devices/window/window_open.png';
    } else if (stateValue === 1 || stateValue === '1') {
      iconUrl = 'assets/img/devices/window/window_tilt.png';
    } else {
      iconUrl = 'assets/img/devices/window/window_close.png';
    }

    windowIcon.style.backgroundImage = `url(${iconUrl})`;
  },

  /**
   * Aktualisiert die Höhe des Rollladens (shutter), basierend auf einem Prozentwert (0-100).
   * - Holt sich den Wert entweder aus `value` (als Parameter) oder aus `ioBrokerStates[mainIcon.dataset.id]`.
   * - Die Höhe in CSS wird als `(100 - wert)%` gesetzt, sodass 0% = ganz oben (Rollladen offen),
   *   100% = ganz unten (Rollladen komplett zu).
   *
   * @function
   * @memberof deviceWindowJS
   * @param {HTMLDivElement} mainIcon - Das DOM-Element mit Klasse `main-icon`.
   * @param {number|string} [value] - (Optional) Neuer Wert des Rollladens,
   *   ansonsten wird er aus den States gelesen.
   * @returns {void}
   */
  updateShutterPosition(mainIcon, value) {
    const shutter = mainIcon.querySelector('.shutter');
    if (!shutter) return;

    const valueId = mainIcon.dataset.id;
    const shutterValue = value
      ? value
      : (valueId ? ioBrokerStates[valueId]?.val : 0);

    // 0 % → shutter ganz oben, 100 % → shutter ganz unten
    shutter.style.height =
      (100 - Math.max(0, Math.min(100, parseInt(shutterValue, 10)))) + '%';
  },

  /**
   * Fügt zusätzliche (sekundäre/erweiterte) Window-Steuerelemente in ein Overlay ein,
   * um z. B. per Slider die Rollladenposition einzustellen.
   *
   * @function
   * @memberof deviceWindowJS
   * @param {HTMLElement} overlayContent - Das Overlay-Container-Element, in das die UI-Elemente eingefügt werden.
   * @param {WindowDeviceDefinition} device - Objekt mit Fenster- und optionalem Rollladen-State.
   * @param {boolean} canWrite - Ob der Nutzer Schreibrechte hat.
   * @returns {void}
   */
  addExtraWindowControls(overlayContent, device, canWrite) {
    const windowControlsContainer = document.createElement('div');
    windowControlsContainer.classList.add('controls-container');

    if (device.value) {
      const value = ioBrokerStates[device.value]?.val || '0';

      const shutterLabel = document.createElement('label');
      shutterLabel.textContent = 'Rollladen:';
      shutterLabel.htmlFor = 'shutter-slider';
      shutterLabel.classList.add('control-label');
      windowControlsContainer.appendChild(shutterLabel);

      const shutterSlider = document.createElement('input');
      shutterSlider.type = 'range';
      shutterSlider.id = 'shutter-slider';
      shutterSlider.name = 'shutter';
      shutterSlider.min = '0';
      shutterSlider.max = '100';
      shutterSlider.disabled = !canWrite;
      shutterSlider.value = value;
      shutterSlider.classList.add('control-input');
      windowControlsContainer.appendChild(shutterSlider);

      const dimmerValueDisplay = document.createElement('span');
      dimmerValueDisplay.id = 'second-display';
      dimmerValueDisplay.textContent = value + '%';
      dimmerValueDisplay.classList.add('control-value-display');
      windowControlsContainer.appendChild(dimmerValueDisplay);

      if (canWrite) {
        shutterSlider.addEventListener('input', () => {
          dimmerValueDisplay.textContent = shutterSlider.value + '%';
        });
      }
    }

    overlayContent.appendChild(windowControlsContainer);

  },

  /**
   * Übernimmt die im Overlay angepassten Werte (z. B. die Rollladenposition) und
   * sendet sie an den entsprechenden ioBroker-State, sofern sie sich vom aktuellen Wert unterscheiden.
   *
   * @function
   * @memberof deviceWindowJS
   * @param {WindowDeviceDefinition} device - Das Fenster-Objekt, das angepasst wird.
   * @param {HTMLElement} overlayContent - Das Overlay-Container-Element, in dem die Werte gelesen werden.
   * @returns {void}
   */
  applyExtraWindowValues(device, overlayContent) {
    const shutterInput = overlayContent.querySelector('input[name="shutter"]');

    // Aktuelle Werte
    const currentValues = {
      shutter: ioBrokerStates[device.value]?.val
    };

    // Neue Werte (vom User eingestellt)
    const newValues = {
      shutter: shutterInput ? parseInt(shutterInput.value, 10) : null
    };

    // Falls sich die Rollladenposition geändert hat → senden
    if (currentValues.shutter !== newValues.shutter && newValues.shutter !== null) {
      ioBrokerJS.sendCommand(device.value, newValues.shutter);
    }
  }
};
