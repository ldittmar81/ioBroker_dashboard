/**
 * Das Modul deviceLightsJS stellt Funktionen bereit, um
 * unterschiedliche Lichtgeräte (einfaches Ein-/Ausschalten, Dimmer, RGB/Hue-Farbsteuerung)
 * im Dashboard darzustellen und zu steuern.
 *
 * @namespace deviceLightsJS
 */
const deviceLightsJS = {

  /**
   * @typedef {Object} LightDeviceDefinition
   * @property {string} value - Die State-ID zum Ein-/Ausschalten des Lichts (boolean).
   * @property {string} [dimmer] - (Optional) State-ID für Dimmerwerte (0-100 %).
   * @property {string} [rgb] - (Optional) State-ID für RGB-Farben (z. B. "#FF0000").
   * @property {string} [hue] - (Optional) State-ID für Hue-Werte (0-360).
   * @property {string} [temperature] - (Optional) State-ID für Farbtemperatur (z. B. 2700-6500 K).
   * @property {string} [iconset] - (Optional) Name eines Iconsets (z.B. "floor", "desk"),
   *    um das korrekte Icon zu laden (z. B. "light_floor.png").
   * @property {Object[]} [status] - (Optional) Array von Statusdefinitionen für die Anzeige
   *    (z. B. [{value: "...", icon: "...", unit: "..."}]).
   */

  /**
   * Erzeugt das Haupt-Lichtsymbol (ohne oder mit Dimmer) und fügt es dem `tileContent` hinzu.
   * - Registriert `device.value` bei `ioBrokerJS.addPageId` als boolean.
   * - Je nach `device.iconset` wird ein anderes Icon geladen (z. B. "light_floor.png").
   * - Bei Klick (falls `canWrite`) wird das Licht an-/ausgeschaltet.
   * - Falls `device.dimmer` existiert, wird nur das Basissymbol erstellt und keine Zustandsaktualisierung
   *   durchgeführt; das übernimmt später z. B. `updateLightValues`.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {HTMLElement} tileContent - Das DOM-Element (z.B. eine Kachel), in das das Lichtsymbol eingefügt wird.
   * @param {LightDeviceDefinition} device - Objekt mit den Geräteinformationen (z.B. `value`, `dimmer`, `iconset`).
   * @param {boolean} canWrite - Gibt an, ob der Nutzer Schreibrechte auf das Licht hat.
   * @returns {void}
   */
  addLightControls(tileContent, device, canWrite) {
    ioBrokerJS.addPageId(device.value, 'boolean');

    const mainIcon = document.createElement('div');
    mainIcon.classList.add('main-icon');
    mainIcon.dataset.id = device.value;

    const isOn = formatJS.isTrue(ioBrokerStates[device.value]?.val);

    let icon = "light.png";
    if (device.iconset) {
      icon = "light_" + device.iconset + ".png";
    }
    mainIcon.style.backgroundImage = 'url(assets/img/devices/light/' + icon + ')';

    // Wenn kein Dimmer, direkt Lichtstatus aktualisieren
    if (!device.dimmer) {
      deviceLightsJS.updateLights(mainIcon, device.value, isOn);
    } else {
      // Licht mit Dimmer
      mainIcon.classList.add('dimmer-light');
    }

    if (canWrite) {
      // Klick-Handler zum Ein-/Ausschalten
      mainIcon.onclick = () => {
        const newValue = !mainIcon.classList.contains('light-on');
        mainIcon.classList.toggle('light-on', newValue);
        mainIcon.style.setProperty('--glow-opacity', newValue ? 1 : 0);
        ioBrokerJS.sendCommand(device.value, newValue);
      };
    }

    tileContent.prepend(mainIcon);
  },

  /**
   * Aktualisiert das Lichtsymbol (einfaches Ein-/Ausschalten ohne Dimmer).
   *
   * @function
   * @memberof deviceLightsJS
   * @param {HTMLDivElement} mainIcon - Das DOM-Element für das Licht (Klasse "main-icon").
   * @param {string} id - Die State-ID für das Licht.
   * @param {boolean|string} value - Aktueller Wert (true/false).
   * @returns {void}
   */
  updateLights(mainIcon, id, value) {
    const isOn = formatJS.isTrue(value);
    mainIcon.classList.toggle('light-on', isOn);
    mainIcon.style.setProperty('--glow-opacity', isOn ? 1 : 0);
  },

  /**
   * Fügt Sekundär-Controls (z.B. Dimmer-Buttons +/-) in die Kachel ein.
   * - Registriert `device.dimmer` als Prozentwert (0-100 %).
   * - Erstellt Buttons zum Hoch-/Runterdimmen und zeigt den aktuellen Wert in einer Anzeige an.
   * - Ruft nach Änderungen `adjustDimmerValue` auf.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {HTMLElement} tileContent - Das Kachel-Element.
   * @param {LightDeviceDefinition} device - Objekt mit mind. `dimmer` als State-ID.
   * @param {boolean} canWrite - Gibt an, ob der Nutzer Schreibrechte auf den Dimmer hat.
   * @returns {void}
   */
  addSecondaryLightControls(tileContent, device, canWrite) {

    if (device.dimmer) {
      ioBrokerJS.addPageId(device.dimmer, '%');

      const controlContainer = document.createElement('div');
      controlContainer.classList.add('second-controls');

      // Minus-Button
      const minusButton = document.createElement('button');
      minusButton.classList.add('second-button', 'minus-button');
      minusButton.innerHTML = '<i class="fas fa-minus"></i>';
      minusButton.disabled = !canWrite;
      controlContainer.appendChild(minusButton);

      // Dimmer-Anzeige
      const dimmerValueDisplay = document.createElement('span');
      dimmerValueDisplay.classList.add('second-display');
      controlContainer.appendChild(dimmerValueDisplay);

      // Plus-Button
      const plusButton = document.createElement('button');
      plusButton.classList.add('second-button', 'plus-button');
      plusButton.innerHTML = '<i class="fas fa-plus"></i>';
      plusButton.disabled = !canWrite;
      controlContainer.appendChild(plusButton);

      // Aktuellen Wert anzeigen
      dimmerValueDisplay.textContent = (ioBrokerStates[device.dimmer]?.val ?? 0) + " %";

      if (canWrite) {
        minusButton.addEventListener('click', () => {
          deviceLightsJS.adjustDimmerValue(device, dimmerValueDisplay, -10, tileContent);
        });

        plusButton.addEventListener('click', () => {
          deviceLightsJS.adjustDimmerValue(device, dimmerValueDisplay, 10, tileContent);
        });
      }

      tileContent.appendChild(controlContainer);
    }

    // Aktualisiert ggf. weitere Werte (z.B. Farbe)
    deviceLightsJS.updateLightValues(tileContent, []);
  },

  /**
   * Passt den Dimmerwert (aktuelle Anzeige) um `change` (z. B. +10 oder -10) an,
   * sendet den neuen Wert an ioBroker und ruft `updateLightValues` auf.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {LightDeviceDefinition} device - Objekt mit `dimmer`-ID.
   * @param {HTMLSpanElement} displayElement - Das DOM-Element, in dem der Dimmerwert angezeigt wird.
   * @param {number} change - Änderung (+/- Wert in Prozent).
   * @param {HTMLElement} tileContent - Das übergeordnete Kachel-Element, in dem sich das Licht befindet.
   * @returns {void}
   */
  adjustDimmerValue(device, displayElement, change, tileContent) {
    const dimmerId = device.dimmer;
    let currentValue = parseInt(displayElement.textContent, 10) || 0;
    let newValue = currentValue + change;

    // Wertebereich begrenzen
    if (newValue > 100) newValue = 100;
    if (newValue < 0) newValue = 0;

    const values = [];
    values.dimmer = newValue;

    if (currentValue !== values.dimmer) {
      ioBrokerJS.sendCommand(dimmerId, values.dimmer);
      deviceLightsJS.updateLightValues(tileContent, values);
    }
  },

  /**
   * Berechnet aus einem Dimmerwert (0-100) die tatsächliche Helligkeit und einen Gloweffect,
   * um das Icon heller oder dunkler darzustellen.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {number|string} value - Der Dimmerwert (0-100).
   * @param {HTMLDivElement} mainIcon - Das DOM-Element des Lichts (Klasse "main-icon").
   * @returns {void}
   */
  changeLightBrightness(value, mainIcon) {
    const dimmerValue = parseInt(value, 10) || 0;
    const exponent = 0.2;
    const maxBrightness = 1.5;
    const brightness = Math.pow(dimmerValue / 100, exponent) * maxBrightness;

    const glowOpacity = dimmerValue / 100;

    mainIcon.style.setProperty('--brightness', brightness);
    mainIcon.style.setProperty('--glow-opacity', glowOpacity);
  },

  /**
   * Aktualisiert die Werte (Dimmer, Farbe, Temperatur) eines Lichts und
   * passt das Icon entsprechend an. Hier wird z. B. `changeLightBrightness` aufgerufen,
   * oder `updateColorIcon`/`updateTemperatureIcon`.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {HTMLElement} tileContent - Das Kachel-Element, in dem sich die Licht-Controls befinden.
   * @param {Object} values - Key-Value-Paar von Änderungen (z. B. {dimmer: 50, color: "#FF0000"}).
   * @returns {void}
   */
  updateLightValues(tileContent, values) {
    const mainIcon = tileContent.querySelector('.main-icon');

    // Licht an/aus?
    const isOn = formatJS.isTrue(ioBrokerStates[mainIcon.dataset.id]?.val);
    mainIcon.classList.toggle('light-on', isOn);

    // Dimmer
    const dimmerId = tileContent.dataset.dimmerId;
    if (dimmerId) {
      const value = values.dimmer
        ? values.dimmer
        : (ioBrokerStates[dimmerId]?.val || '0');

      const displayElement = tileContent.querySelector('.second-display');
      displayElement.textContent = value + " %";

      deviceLightsJS.changeLightBrightness(value, mainIcon);
    }

    // Farbsystem (RGB oder Hue)
    const rgbId = tileContent.dataset.rgbId;
    const hueId = tileContent.dataset.hueId;
    const type = rgbId ? "rgb" : hueId ? "hue" : false;

    const farbId = rgbId || hueId;

    // Farbtemperatur
    const tempId = tileContent.dataset.temperatureId;

    if (type && tempId) {
      // Vergleiche Zeitstempel (RGB/Hue vs. Temperatur) => wer war zuletzt geändert?
      const rgbTs = ioBrokerStates[farbId]?.ts || 0;
      const tempTs = ioBrokerStates[tempId]?.ts || 0;
      if (rgbTs >= tempTs) {
        // Farbe hat Priorität
        let colorValue = values.color
          ? values.color
          : type === "rgb"
            ? (ioBrokerStates[rgbId]?.val || '#ffffff')
            : (formatJS.hueToHex(ioBrokerStates[hueId]?.val));

        deviceLightsJS.updateColorIcon(colorValue, farbId, type);
      } else {
        // Farbtemperatur hat Priorität
        const tempValue = values.temperature
          ? values.temperature
          : (ioBrokerStates[tempId]?.val || '2700');
        deviceLightsJS.updateTemperatureIcon(tempValue, tempId);
      }
    } else if (type) {
      // Nur Farbe
      const colorValue = values.color
        ? values.color
        : type === "rgb"
          ? (ioBrokerStates[rgbId]?.val || '#ffffff')
          : (formatJS.hueToHex(ioBrokerStates[hueId]?.val));
      deviceLightsJS.updateColorIcon(colorValue, farbId, type);
    } else if (tempId) {
      // Nur Farbtemperatur
      const tempValue = values.temperature
        ? values.temperature
        : (ioBrokerStates[tempId]?.val || '2700');
      deviceLightsJS.updateTemperatureIcon(tempValue, tempId);
    }
  },

  /**
   * Aktualisiert das Icon mit einer RGB- oder Hue-Farbe, indem CSS-Variablen gesetzt werden.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {string} colorValue - Hex-Farbwert (z. B. "#FF0000") oder konvertierter Hue-Wert.
   * @param {string} id - State-ID (RGB oder Hue).
   * @param {"rgb"|"hue"} type - Gibt an, ob RGB oder Hue verwendet wird.
   * @returns {void}
   */
  updateColorIcon(colorValue, id, type) {
    const tile = document.querySelector(`.tile-content[data-${type}-id="${id}"]`);
    if (tile) {
      const mainIcon = tile.querySelector('.main-icon');
      if (mainIcon) {
        mainIcon.style.setProperty('--light-color', colorValue);
        mainIcon.style.setProperty('--light-color-alpha', formatJS.hexToRgba(colorValue, 0.4));
        mainIcon.style.setProperty('--light-color-glow', formatJS.hexToRgba(colorValue, 0.6));
      }
    }
  },

  /**
   * Setzt anhand der Farbtemperatur (Kelvin) die CSS-Variablen am Icon,
   * um die Lichtfarbe zu simulieren (z. B. warmweiß bis kaltweiß).
   *
   * @function
   * @memberof deviceLightsJS
   * @param {number|string} temperatureValue - Farbtemperatur in Kelvin (z. B. 2700).
   * @param {string} id - State-ID für die Farbtemperatur.
   * @returns {void}
   */
  updateTemperatureIcon(temperatureValue, id) {
    const tile = document.querySelector(`.tile-content[data-temperature-id="${id}"]`);
    if (tile) {
      const mainIcon = tile.querySelector('.main-icon');
      if (mainIcon) {
        const temp = parseInt(temperatureValue, 10) || 0;
        const colorValue = formatJS.getRGBFromTemperature(temp);

        mainIcon.style.setProperty('--light-color', colorValue);
        mainIcon.style.setProperty('--light-color-alpha', colorValue);
        mainIcon.style.setProperty('--light-color-glow', colorValue);
      }
    }
  },

  /**
   * Erstellt ein Overlay oder einen Container mit erweiterten Optionen (z. B. RGB-Picker,
   * Dimmer-Slider, Farbtemperatur-Slider) für das Licht.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {HTMLElement} container - Das Overlay- oder Container-Element.
   * @param {LightDeviceDefinition} device - Enthält `value` und optional `rgb`, `hue`, `temperature`, `dimmer`.
   * @param {boolean} canWrite - Gibt an, ob der Nutzer Schreibrechte auf das Licht hat.
   * @returns {void}
   */
  addExtraLightControls(container, device, canWrite) {
    const rgbControlsContainer = document.createElement('div');
    rgbControlsContainer.classList.add('rgb-controls');

    // Schalter (Boolean)
    fieldsForDevicesJS.addBooleanControl(rgbControlsContainer, {
      "id": device.value,
      "function": "Licht",
      "inputField": "switch"
    }, canWrite);

    const type = device.rgb ? "rgb" : device.hue ? "hue" : false;

    // RGB-Farbwähler
    if (type) {
      demoJS.addDemoValue(device[type], type);

      const colorLabel = document.createElement('label');
      colorLabel.textContent = 'Farbe:';
      colorLabel.htmlFor = 'color-picker';
      rgbControlsContainer.appendChild(colorLabel);

      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.id = 'color-picker';
      colorPicker.name = 'color';
      colorPicker.disabled = !canWrite;
      colorPicker.value = type === "rgb"
        ? (ioBrokerStates[device[type]]?.val || '#ffffff')
        : (formatJS.hueToHex(ioBrokerStates[device[type]]?.val));
      rgbControlsContainer.appendChild(colorPicker);
    }

    // Farbtemperatur
    if (device.temperature) {
      demoJS.addDemoValue(device.temperature, 'K');
      const tempLabel = document.createElement('label');
      tempLabel.textContent = 'Farbtemperatur:';
      tempLabel.htmlFor = 'temp-slider';
      rgbControlsContainer.appendChild(tempLabel);

      const tempSlider = document.createElement('input');
      tempSlider.type = 'range';
      tempSlider.id = 'temp-slider';
      tempSlider.name = 'temperature';
      tempSlider.min = '2000';
      tempSlider.max = '6500';
      tempSlider.disabled = !canWrite;
      tempSlider.value = ioBrokerStates[device.temperature]?.val || '2000';
      tempSlider.classList.add('temp-slider');
      rgbControlsContainer.appendChild(tempSlider);

      const tempValueDisplay = document.createElement('span');
      tempValueDisplay.id = 'temp-value';
      tempValueDisplay.textContent = tempSlider.value + 'K';
      rgbControlsContainer.appendChild(tempValueDisplay);

      if (canWrite) {
        // Echtzeit-Feedback für Temperatur
        tempSlider.addEventListener('input', () => {
          tempValueDisplay.textContent = tempSlider.value + 'K';
        });
      }
    }

    // Dimmer
    if (device.dimmer) {
      const dimmerLabel = document.createElement('label');
      dimmerLabel.textContent = 'Helligkeit:';
      dimmerLabel.htmlFor = 'dimmer-slider';
      rgbControlsContainer.appendChild(dimmerLabel);

      const dimmerSlider = document.createElement('input');
      dimmerSlider.type = 'range';
      dimmerSlider.id = 'dimmer-slider';
      dimmerSlider.name = 'dimmer';
      dimmerSlider.min = '0';
      dimmerSlider.max = '100';
      dimmerSlider.disabled = !canWrite;
      dimmerSlider.value = ioBrokerStates[device.dimmer]?.val || '0';
      rgbControlsContainer.appendChild(dimmerSlider);

      const dimmerValueDisplay = document.createElement('span');
      dimmerValueDisplay.id = 'second-display';
      dimmerValueDisplay.textContent = dimmerSlider.value + '%';
      rgbControlsContainer.appendChild(dimmerValueDisplay);

      if (canWrite) {
        // Echtzeit-Feedback für den Dimmer
        dimmerSlider.addEventListener('input', () => {
          dimmerValueDisplay.textContent = dimmerSlider.value + '%';
        });
      }
    }

    container.appendChild(rgbControlsContainer);
  },

  /**
   * Liest die Werte aus den Overlay-Elementen (z. B. color, dimmer, temperature)
   * und vergleicht sie mit den aktuellen Werten in `ioBrokerStates`.
   * - Schaltet das Licht ein/aus (boolean).
   * - Aktualisiert Farbe/Hue, Dimmer, Temperatur.
   * - Ruft `updateLightValues()` auf, wenn sich etwas geändert hat.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {LightDeviceDefinition} device - Enthält `value`, optional `rgb` oder `hue`, `dimmer`, `temperature`.
   * @param {HTMLElement} overlayContent - Das Overlay-Element mit den entsprechenden Inputs.
   * @returns {void}
   */
  applyExtraLightValues(device, overlayContent) {
    const stateInput = overlayContent.querySelector('input[name="switch"]');
    const colorInput = overlayContent.querySelector('input[name="color"]');
    const dimmerInput = overlayContent.querySelector('input[name="dimmer"]');
    const tempInput = overlayContent.querySelector('input[name="temperature"]');

    const type = device.rgb ? "rgb" : device.hue ? "hue" : false;
    let color;
    switch (type) {
      case "rgb":
        color = ioBrokerStates[device.rgb]?.val;
        break;
      case "hue":
        color = formatJS.hueToHex(ioBrokerStates[device.hue]?.val);
        break;
      default:
        color = null;
    }

    // Aktuelle Werte
    const currentValues = {
      color: color,
      dimmer: device.dimmer ? ioBrokerStates[device.dimmer]?.val : null,
      temperature: device.temperature ? ioBrokerStates[device.temperature]?.val : null,
      state: ioBrokerStates[device.value]?.val
    };

    // Neue Werte
    const newValues = {
      color: colorInput ? colorInput.value : null,
      dimmer: dimmerInput ? dimmerInput.value : null,
      temperature: tempInput ? tempInput.value : null,
      state: stateInput ? stateInput.checked : null
    };

    let isColorChanged = false;
    let isChanged = false;

    // Licht an/aus
    if (currentValues.state !== newValues.state) {
      ioBrokerJS.sendCommand(device.value, newValues.state);
    }

    // Farbe (RGB/Hue)
    if (device.rgb && newValues.color && newValues.color !== currentValues.color) {
      ioBrokerJS.sendCommand(device.rgb, newValues.color);
      isColorChanged = true;
      isChanged = true;
    } else if (device.hue && newValues.color && newValues.color !== currentValues.color) {
      ioBrokerJS.sendCommand(device.hue, formatJS.hexToHue(newValues.color));
      isColorChanged = true;
      isChanged = true;
    }

    // Dimmer
    if (device.dimmer && newValues.dimmer && newValues.dimmer !== currentValues.dimmer) {
      ioBrokerJS.sendCommand(device.dimmer, newValues.dimmer);
      isChanged = true;
    }

    // Farbtemperatur (nur aktualisieren, wenn keine Farbänderung stattgefunden hat)
    if (device.temperature && !isColorChanged && newValues.temperature && newValues.temperature !== currentValues.temperature) {
      ioBrokerJS.sendCommand(device.temperature, newValues.temperature);
      isChanged = true;
    }

    // UI-Update, wenn sich etwas geändert hat
    if (isChanged) {
      const tileContent = document.querySelector(`.tile-content[data-dimmer-id="${device.dimmer}"]`);
      deviceLightsJS.updateLightValues(tileContent, newValues);
    }
  },

  /**
   * Ergänzt das `device.status`-Array um einen Eintrag für den Lichtzustand (true/false).
   * - Dieses Status-Objekt kann später für die Anzeige im Dashboard (z. B. "an"/"aus" mit Icons) genutzt werden.
   *
   * @function
   * @memberof deviceLightsJS
   * @param {HTMLElement|any} extraInfo - (Nicht unbedingt genutzt) oder Container, an den du weitere Infos anhängen kannst.
   * @param {LightDeviceDefinition} device - Das Geräteobjekt, das ggf. `status`-Informationen erhält.
   * @returns {void}
   */
  addExtraLightInfo(extraInfo, device) {
    let statusList = device.status ? device.status : [];
    let newStatuses = [];

    const lightStatus = {
      value: device.value,
      icon: 'fa-lightbulb',
      unit: 'boolean',
      labels: [
        "true:an", "false:aus"
      ]
    };

    newStatuses.push(lightStatus);
    device.status = newStatuses.concat(statusList);
  }
};
