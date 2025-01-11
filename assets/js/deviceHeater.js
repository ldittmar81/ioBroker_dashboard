/**
 * Das Modul deviceHeaterJS stellt Funktionen bereit, um:
 * - ein Heizsymbol anzuzeigen und bei Aktivierung zu "glühen".
 * - Temperaturwerte per Button bzw. Slider anzupassen.
 * - zusätzliche Statusinformationen (Temperatur, Feuchtigkeit) zu ergänzen.
 *
 * @namespace deviceHeaterJS
 */
const deviceHeaterJS = {

  /**
   * @typedef {Object} HeaterDeviceDefinition
   * @property {string} value - State-ID zum Ein-/Ausschalten der Heizung (boolean).
   * @property {string} [temperature_set] - (Optional) State-ID zur Solltemperatur-Einstellung.
   * @property {string} [temperature] - (Optional) State-ID für die Ist-Temperatur (Anzeigezwecke).
   * @property {string} [humidity] - (Optional) State-ID für die Luftfeuchtigkeit (Anzeigezwecke).
   * @property {Array} [status] - (Optional) Ein Array von Statusdefinitionen (z. B. {value, unit, icon}).
   * @property {string} [name] - (Optional) Interner Gerätename (wird hier kaum genutzt).
   */

  /**
   * Fügt das Haupt-Heizungssymbol (Icon) in die Kachel ein.
   * - Registriert `device.value` als boolean State-ID.
   * - Erzeugt ein `<div class="main-icon">` mit Hintergrundbild einer Heizung.
   * - Ruft `updateHeaterIcon` auf, um die Glüh-Effekte einzublenden, wenn aktiv.
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {HTMLElement} tileContent - Das Container-Element (z.B. eine Kachel), in das das Icon eingefügt wird.
   * @param {HeaterDeviceDefinition} device - Gerätekonfiguration (enthält `value`, optional `temperature_set`, usw.).
   * @returns {void}
   */
  addHeaterControls(tileContent, device) {
    ioBrokerJS.addPageId(device.value, 'boolean');

    // Heizungssymbol
    const mainIcon = document.createElement('div');
    mainIcon.classList.add('main-icon');
    mainIcon.dataset.id = device.value;

    const isOn = formatJS.isTrue(ioBrokerStates[device.value]?.val);
    mainIcon.style.backgroundImage = 'url(assets/img/devices/heater/heater.png)';
    deviceHeaterJS.updateHeaterIcon(mainIcon, isOn);

    tileContent.prepend(mainIcon);
  },

  /**
   * Aktualisiert das Icon einer Heizung, indem es eine Glüh-Animation (CSS) aktiviert/deaktiviert.
   * - Bei aktivierter Heizung (`isOn = true`) werden zusätzliche Elemente (`.heat-strip`) ins DOM eingefügt.
   * - Bei deaktivierter Heizung werden sie entfernt.
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {HTMLDivElement} mainIcon - Das DOM-Element mit `class="main-icon"`.
   * @param {boolean} isOn - Gibt an, ob die Heizung an (`true`) oder aus (`false`) ist.
   * @returns {void}
   */
  updateHeaterIcon(mainIcon, isOn) {
    isOn = formatJS.isTrue(isOn);
    mainIcon.classList.toggle('heater-on', isOn);
    mainIcon.style.setProperty('--glow-opacity', isOn ? 1 : 0);

    const heatStripLeft = mainIcon.querySelectorAll('.heat-strip.left');
    const heatStripRight = mainIcon.querySelectorAll('.heat-strip.right');
    if (isOn && heatStripLeft.length === 0) {
      const heatStripLeftEl = document.createElement('div');
      heatStripLeftEl.classList.add('heat-strip', 'left');
      mainIcon.appendChild(heatStripLeftEl);

      const heatStripRightEl = document.createElement('div');
      heatStripRightEl.classList.add('heat-strip', 'right');
      mainIcon.appendChild(heatStripRightEl);

    } else if (!isOn && heatStripLeft.length > 0) {
      heatStripLeft.forEach(strip => mainIcon.removeChild(strip));
      heatStripRight.forEach(strip => mainIcon.removeChild(strip));
    }
  },

  /**
   * Fügt sekundäre Controls (Temperatur einstellen: +/- Button) in die Kachel ein.
   * - Registriert `device.temperature_set` als State-ID für °C.
   * - Erzeugt Buttons für Plus und Minus sowie eine Anzeige.
   * - Klicks auf +/- rufen `adjustTemperature` auf.
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {HTMLElement} tileContent - Das Container-Element für diese Bedienelemente.
   * @param {HeaterDeviceDefinition} device - Enthält mindestens `temperature_set` (für die Solltemperatur).
   * @param {boolean} canWrite - Gibt an, ob der Benutzer Schreibrechte hat.
   * @returns {void}
   */
  addSecondaryHeaterControls(tileContent, device, canWrite) {
    if (device.temperature_set) {
      ioBrokerJS.addPageId(device.temperature_set, '°C');
      const temperatureContainer = document.createElement('div');
      temperatureContainer.classList.add('second-controls');

      // Minus-Button
      const minusButton = document.createElement('button');
      minusButton.classList.add('second-button', 'minus-button');
      minusButton.innerHTML = '<i class="fas fa-temperature-arrow-down"></i>';
      minusButton.disabled = !canWrite;
      temperatureContainer.appendChild(minusButton);

      // Temperaturanzeige
      const tempDisplay = document.createElement('span');
      tempDisplay.classList.add('second-display');
      tempDisplay.dataset.set = device.temperature_set;
      tempDisplay.textContent = (ioBrokerStates[device.temperature_set]?.val ?? 20) + ' °C';
      temperatureContainer.appendChild(tempDisplay);

      // Plus-Button
      const plusButton = document.createElement('button');
      plusButton.classList.add('second-button', 'plus-button');
      plusButton.innerHTML = '<i class="fas fa-temperature-arrow-up"></i>';
      plusButton.disabled = !canWrite;
      temperatureContainer.appendChild(plusButton);

      if (canWrite) {
        // Event-Listener für Minus-Button
        minusButton.addEventListener('click', () => {
          deviceHeaterJS.adjustTemperature(device, tempDisplay, -1);
        });

        // Event-Listener für Plus-Button
        plusButton.addEventListener('click', () => {
          deviceHeaterJS.adjustTemperature(device, tempDisplay, 1);
        });
      }

      tileContent.appendChild(temperatureContainer);
    }
  },

  /**
   * Fügt erweiterte Heizer-Controls in ein Overlay oder ein Container-Element ein
   * (z. B. Boolean-Toggle für Ein/Aus + Range-Slider für Temperatureinstellung).
   *
   * - Nutzt `fieldsForDevicesJS.addBooleanControl` für den Heizungsstatus.
   * - Erstellt zusätzlich einen Slider (Range) für die Solltemperatur (16-25 °C).
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {HTMLElement} container - Das Container-Element (z. B. ein Overlay).
   * @param {HeaterDeviceDefinition} device - Enthält `value`, optional `temperature_set` etc.
   * @param {boolean} canWrite - Gibt an, ob der Benutzer Schreibrechte hat.
   * @returns {void}
   */
  addExtraHeaterControls(container, device, canWrite) {
    const heaterControlsContainer = document.createElement('div');
    heaterControlsContainer.classList.add('controls-container');

    // Boolean-Toggle (Ein/Aus)
    fieldsForDevicesJS.addBooleanControl(heaterControlsContainer, {
      "id": device.value,
      "function": "Heizung",
      "inputField": "heater_state"
    }, canWrite);

    // Range-Slider für Temperatur
    if (device.temperature_set) {
      const temperatureLabel = document.createElement('label');
      temperatureLabel.textContent = 'Temperatur:';
      temperatureLabel.htmlFor = 'temperature-slider';
      temperatureLabel.classList.add('control-label');
      heaterControlsContainer.appendChild(temperatureLabel);

      const temperatureSlider = document.createElement('input');
      temperatureSlider.type = 'range';
      temperatureSlider.id = 'temperature_set-slider';
      temperatureSlider.name = 'temperature_set';
      temperatureSlider.min = '16';
      temperatureSlider.max = '25';
      temperatureSlider.classList.add('control-input');
      temperatureSlider.value = ioBrokerStates[device.temperature_set]?.val || '0';
      temperatureSlider.disabled = !canWrite;
      heaterControlsContainer.appendChild(temperatureSlider);

      const temperatureValueDisplay = document.createElement('span');
      temperatureValueDisplay.classList.add('control-value-display');
      temperatureValueDisplay.id = 'second-display';
      temperatureValueDisplay.textContent = temperatureSlider.value + '°C';
      heaterControlsContainer.appendChild(temperatureValueDisplay);

      // Echtzeit-Feedback beim Slider
      if (canWrite) {
        temperatureSlider.addEventListener('input', () => {
          temperatureValueDisplay.textContent = temperatureSlider.value + '°C';
        });
      }
    }

    container.appendChild(heaterControlsContainer);
  },

  /**
   * Ergänzt das `device.status`-Array um Ist-Temperatur und Feuchtigkeit,
   * sodass die Dashboard-Anzeige entsprechende Werte ausgeben kann.
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {Array|HTMLElement} extraInfo - (Nicht verwendet) oder Container für Zusatzinfos.
   * @param {HeaterDeviceDefinition} device - Gerätekonfiguration.
   * @returns {void}
   */
  addExtraHeaterInfo(extraInfo, device) {
    let statusList = device.status ? device.status : [];
    let newStatuses = [];

    if (device.temperature) {
      const tempStatus = {
        value: device.temperature,
        icon: 'fa-temperature-half',
        unit: '°C',
        decimal: 1
      };
      newStatuses.push(tempStatus);
    }

    if (device.humidity) {
      const humidityStatus = {
        value: device.humidity,
        icon: 'fa-droplet',
        unit: '%',
        decimal: 0
      };
      newStatuses.push(humidityStatus);
    }

    device.status = newStatuses.concat(statusList);
  },

  /**
   * Ändert den Temperatur-Sollwert um `+1` oder `-1` und sendet den neuen Wert an ioBroker.
   * - Begrenzt den Einstellbereich auf 16 °C bis 25 °C.
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {HeaterDeviceDefinition} device - Objekt mit `temperature_set`-ID.
   * @param {HTMLSpanElement} displayElement - Das DOM-Element, in dem die aktuelle Temperatur angezeigt wird.
   * @param {number} change - Die Änderung (+1 oder -1).
   * @returns {void}
   */
  adjustTemperature(device, displayElement, change) {
    const tempSetId = device.temperature_set;
    let currentTemp = parseInt(displayElement.textContent, 10) || 20;
    let newTemp = currentTemp + change;

    // Wertebereich begrenzen (z.B. 16°C bis 25°C)
    newTemp = Math.max(16, Math.min(25, newTemp));

    if (currentTemp !== newTemp) {
      ioBrokerJS.sendCommand(tempSetId, newTemp);
      displayElement.textContent = newTemp + ' °C';
    }
  },

  /**
   * Wendet die Änderungen aus dem Overlay (oder Formular) an:
   * - Liest `temperature_set` und `heater_state` aus DOM-Elementen aus.
   * - Vergleicht sie mit den aktuellen Werten in `ioBrokerStates`.
   * - Sendet neue Werte an ioBroker, wenn es Abweichungen gibt.
   *
   * @function
   * @memberof deviceHeaterJS
   * @param {HeaterDeviceDefinition} device - Enthält `value` und optional `temperature_set`.
   * @param {HTMLElement} overlayContent - Das Overlay-Element mit den entsprechenden Inputs.
   * @returns {void}
   */
  applyExtraHeaterValues(device, overlayContent) {
    const tempInput = overlayContent.querySelector('input[name="temperature_set"]');
    const stateInput = overlayContent.querySelector('input[name="heater_state"]');

    // Aktuelle Werte
    const currentValues = {
      temperature_set: device.temperature_set ? ioBrokerStates[device.temperature_set]?.val : null,
      state: ioBrokerStates[device.value]?.val
    };

    // Neue Werte (vom User eingestellt)
    const newValues = {
      temperature_set: tempInput ? parseInt(tempInput.value, 10) : null,
      state: stateInput ? stateInput.checked : null
    };

    // Zustand (Heizung an/aus) vergleichen
    if (currentValues.state !== newValues.state) {
      ioBrokerJS.sendCommand(device.value, newValues.state);
    }

    // Solltemperatur vergleichen
    if (
      device.temperature_set &&
      newValues.temperature_set !== null &&
      newValues.temperature_set !== currentValues.temperature_set
    ) {
      ioBrokerJS.sendCommand(device.temperature_set, newValues.temperature_set);

      // UI-Update für die Kachel anzeigen
      const tile = document.querySelector(`.item-tile[data-temperature-set-id="${device.temperature_set}"]`);
      if (tile) {
        const tempDisplay = tile.querySelector('.second-display');
        if (tempDisplay) {
          tempDisplay.textContent = newValues.temperature_set + ' °C';
        }
      }
    }
  }
};
