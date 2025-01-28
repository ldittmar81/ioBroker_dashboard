/**
 * Das Modul mainDeviceJS kümmert sich um das Erstellen, Darstellen und
 * Verwalten verschiedener Gerätetypen (lights, heater, window etc.) in Kacheln.
 * Es stellt Methoden bereit, um für jedes Gerät:
 * - die Primären Controls (addDeviceControls)
 * - Sekundäre Controls (addSecondaryDeviceControls)
 * - Extra-Controls (addExtraDeviceControls)
 * - und Zusatzinfos (addExtraInfo)
 * zu generieren.
 *
 * Darüber hinaus existieren Methoden zum Öffnen von Overlay-Settings,
 * Anzeigen von Hardwareinfos und Steuerung mehrerer Geräte auf einer Seite (displayItemTiles).
 *
 * @namespace mainDeviceJS
 */
const mainDeviceJS = {

  /**
   * @typedef {Object} DeviceDefinition
   * @property {string} name - Anzeigename des Geräts.
   * @property {string} type - Gerätekategorie (z.B. "light", "heater", "window", "plug", etc.).
   * @property {string} [value] - State-ID für den Hauptwert (z.B. Ein/Aus, Rollladenposition, etc.).
   * @property {string} [state] - State-ID für einen sekundären Zustand (z.B. Fenster offen/zu).
   * @property {string} [temperature] - (Optional) State-ID für die Temperatur.
   * @property {string} [humidity] - (Optional) State-ID für die Luftfeuchtigkeit.
   * @property {string} [dimmer] - (Optional) State-ID für einen Dimmer (0–100%).
   * @property {string} [rgb] - (Optional) State-ID für RGB-Werte (z. B. "#ffffff").
   * @property {Object[]} [hardware] - (Optional) Array von Objekten für Hardware (z.B. unreach, rssi, lowbat).
   * @property {Object[]} [controls] - (Optional) Array von Control-Definitionen (z. B. Buttons, boolean toggles).
   * @property {Object[]} [info] - (Optional) Array von Info-Objekten (z. B. { label, value, unit, ... }).
   * @property {Object[]} [status] - (Optional) Array von Status-Definitionen für die Anzeige (z. B. Error/Warning).
   * @property {boolean|string} [hidden] - (Optional) State-ID oder Wert, um die Kachel auszublenden.
   * // ... weitere Felder je nach Bedarf.
   */

  /**
   * Fügt das primäre Device-Control (z.B. ein Lampen-Icon, Fenster-Icon etc.)
   * in die Kachel ein und ruft das spezifische Modul (deviceLightsJS, deviceHeaterJS, etc.) auf.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} tileContent - Das DOM-Element (div), in dem die Controls platziert werden sollen.
   * @param {DeviceDefinition} device - Das Gerät mit den relevanten Feldern (type, value etc.).
   * @param {HTMLElement} tile - Das übergeordnete Tile-Element (z. B. `<div class="item-tile">`).
   * @param {boolean} canWrite - Gibt an, ob der User Schreibrechte für dieses Gerät hat.
   * @returns {void}
   */
  addDeviceControls(tileContent, device, tile, canWrite) {
    switch (device.type) {
      case 'light':
        tile.classList.add('light-tile');
        deviceLightsJS.addLightControls(tileContent, device, canWrite);
        break;
      case 'heater':
        tile.classList.add('heater-tile');
        deviceHeaterJS.addHeaterControls(tileContent, device, canWrite);
        break;
      case 'window':
        tile.classList.add('window-tile');
        deviceWindowJS.addWindowControls(tileContent, device, canWrite);
        break;
      case 'button':
        tile.classList.add('button-tile');
        deviceButtonJS.addButtonControls(tileContent, device, canWrite);
        break;
      case 'door':
        tile.classList.add('door-tile');
        deviceDoorJS.addDoorControls(tileContent, device);
        break;
      case 'plug':
        tile.classList.add('plug-tile');
        devicePlugJS.addPlugControls(tileContent, device, canWrite);
        break;
      case 'media':
        tile.classList.add('media-tile');
        deviceMediaJS.addMediaControls(tileContent, device, canWrite);
        break;
      case 'temperature':
        tile.classList.add('temperature-tile');
        deviceTemperatureJS.addTemperatureControls(tileContent, device);
        break;
      case 'ioBroker_ical':
        tile.classList.add('ioBroker_ical-tile');
        deviceIoBrokerIcalJS.addIoBrokerIcalControls(tileContent, device);
        break;
      case 'iframe':
        tile.classList.add('iframe-tile');
        deviceIframeJS.addIframeControls(tileContent, device);
        break;
      default:
        console.warn(`Gerätetyp "${device.type}" wird nicht unterstützt.`);
    }
  },

  /**
   * Fügt sekundäre Controls hinzu, z. B. Dimmerbuttons, Heizung-Extra-Buttons, Media-Buttons usw.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} tileContent - Das Kachel-Element, in das die Controls eingefügt werden.
   * @param {DeviceDefinition} device - Gerätedaten.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addSecondaryDeviceControls(tileContent, device, canWrite) {
    switch (device.type) {
      case 'light':
        deviceLightsJS.addSecondaryLightControls(tileContent, device, canWrite);
        break;
      case 'heater':
        deviceHeaterJS.addSecondaryHeaterControls(tileContent, device, canWrite);
        break;
      case 'media':
        deviceMediaJS.addSecondaryMediaControls(tileContent, device, canWrite);
        break;
      case 'window':
      case 'button':
      case 'door':
      case 'plug':
        break;
      default:
        console.warn(`Gerätetyp "${device.type}" wird im Secondary nicht unterstützt.`);
    }
  },

  /**
   * Fügt Extra-Controls (z. B. Einstellungs-Buttons oder Kanalauswahl) hinzu.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} tileContent - Das Kachel-Element.
   * @param {DeviceDefinition} device - Gerätedaten.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addExtraDeviceControls(tileContent, device, canWrite) {
    const extraControlDiv = document.createElement('div');
    extraControlDiv.classList.add('extra-controls');

    // Standard-Settings-Button
    mainDeviceJS.createExtraButton(extraControlDiv, device, canWrite);

    // Media: Kanäle-Button, falls Kanallisten vorhanden
    if (
      device.type === "media" &&
      ((device.channels && device.channels.length > 0) ||
        (device.channellists && device.channellists.length > 0))
    ) {
      mainDeviceJS.createExtraMediaButton(extraControlDiv, device, canWrite);
    }

    if (extraControlDiv.childElementCount > 0) {
      tileContent.appendChild(extraControlDiv);
    }
  },

  /**
   * Fügt Extra-Infos (z. B. Statusanzeigen) in die Kachel ein.
   * Hier wird unterschieden, ob das Gerät z.B. ein 'heater' oder 'light' ist,
   * um gerätespezifische Extra-Infos hinzuzufügen.
   * Anschließend wird `addExtraDeviceInfo` aufgerufen, um Status-Infos (z. B. Error/Warning) zu platzieren.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} tile - Die gesamte Geräte-Kachel.
   * @param {DeviceDefinition} device - Gerätedaten.
   * @returns {void}
   */
  addExtraInfo(tile, device) {
    const extraInfo = document.createElement('div');
    extraInfo.classList.add('extra-info');

    switch (device.type) {
      case 'heater':
        deviceHeaterJS.addExtraHeaterInfo(extraInfo, device);
        break;
      case 'light':
        deviceLightsJS.addExtraLightInfo(extraInfo, device);
        break;
      case 'window':
      case 'button':
      case 'plug':
      case 'door':
        // nichts tun
        break;
      default:
        console.warn(`Gerätetyp "${device.type}" wird im Extra nicht unterstützt.`);
    }
    mainDeviceJS.addExtraDeviceInfo(extraInfo, device);

    tile.appendChild(extraInfo);
  },

  /**
   * Wendet Einstellungen aus einem Overlay (oder Formular) auf das Gerät an.
   * Hier werden z.B. Extra Light Values oder Heater Values gesetzt
   * und Control-Methoden (z. B. processButtonControl) aufgerufen.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {DeviceDefinition} device - Das Gerät, für das die Einstellungen übernommen werden.
   * @param {HTMLElement} overlayContent - Das DOM-Element, das die Eingabefelder enthält.
   * @returns {void}
   */
  applySettings(device, overlayContent) {
    switch (device.type) {
      case 'light':
        deviceLightsJS.applyExtraLightValues(device, overlayContent);
        break;
      case 'heater':
        deviceHeaterJS.applyExtraHeaterValues(device, overlayContent);
        break;
      case 'window':
        deviceWindowJS.applyExtraWindowValues(device, overlayContent);
        break;
    }

    // Controls verarbeiten (z. B. Buttons, Booleans, NumberFields usw.)
    if (device.controls && device.controls.length > 0) {
      device.controls.forEach(control => {
        switch (control.type || 'button') {
          case 'button':
            fieldsForDevicesJS.processButtonControl(overlayContent, control);
            break;
          case 'boolean':
            fieldsForDevicesJS.processBooleanControl(overlayContent, control);
            break;
          case 'text':
            fieldsForDevicesJS.processTextControl(overlayContent, control);
            break;
          case 'number':
            fieldsForDevicesJS.processNumberControl(overlayContent, control);
            break;
          case 'color':
            fieldsForDevicesJS.processColorControl(overlayContent, control);
            break;
          case 'list':
            fieldsForDevicesJS.processListControl(overlayContent, control);
            break;
          case 'colorList':
            fieldsForDevicesJS.processColorListControl(overlayContent, control);
            break;
        }
      });
    }
  },

  /**
   * Erzeugt den Extra-Button "Einstellungen", der das Einstellungs-Overlay öffnet.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} div - Der Container, in den der Button eingefügt wird.
   * @param {DeviceDefinition} device - Gerätedaten.
   * @param {boolean} canWrite - Gibt an, ob der Button klickbar ist.
   * @returns {void}
   */
  createExtraButton(div, device, canWrite) {
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('settings-button');

    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-cog');
    settingsButton.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = "Einstellungen";
    settingsButton.appendChild(text);

    // Klick öffnet Overlay
    settingsButton.onclick = () => mainDeviceJS.openSettingsOverlay(device, canWrite);

    div.appendChild(settingsButton);
  },

  /**
   * Erzeugt einen zusätzlichen Button "Kanäle" (für Medien), um z. B. einen
   * Overlay mit Senderliste o. Ä. zu öffnen.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} div - Container für diesen Button.
   * @param {DeviceDefinition} device - Media-Gerätedaten (channels, channellists).
   * @param {boolean} canWrite - Schreibrechte?
   * @returns {void}
   */
  createExtraMediaButton(div, device, canWrite) {
    const channelsButton = document.createElement('button');
    channelsButton.classList.add('channel-button');

    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-tv');
    channelsButton.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = "Kanäle";
    channelsButton.appendChild(text);

    // Klick => channel-Overlay öffnen
    channelsButton.onclick = () => deviceMediaJS.openChannelsOverlay(device, canWrite);

    div.appendChild(channelsButton);
  },

  /**
   * Fügt Informationen aus dem Feld `device.status` hinzu (z. B. "Licht an/aus",
   * "Temperatur", "Batterie"). Diese werden in Intervallen durchgewechselt, falls mehrere Items vorhanden sind.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} extraInfo - Container, in den die Infos eingefügt werden.
   * @param {DeviceDefinition} device - Gerät, das ein `status`-Array besitzt.
   * @returns {void}
   */
  addExtraDeviceInfo(extraInfo, device) {
    if (!device.status || !Array.isArray(device.status) || device.status.length === 0) {
      return;
    }

    let statusItems = device.status.map(status => {
      // State-ID registrieren
      ioBrokerJS.addPageId(status.value, status.unit, status.type);
      return {
        id: status.value,
        icon: status.icon || '',
        unit: status.unit,
        decimal: status.decimal,
        labels: status.labels
      };
    });

    let currentIndex = 0;
    const displayCount = 2;

    extraInfo.style.opacity = '1';
    extraInfo.style.transition = 'opacity 0.5s ease-in-out';

    // Funktion zum Anzeigen der aktuellen Status-Items
    function displayStatus() {
      extraInfo.innerHTML = '';

      const itemsToDisplay = statusItems.slice(currentIndex, currentIndex + displayCount);
      itemsToDisplay.forEach(item => {
        const statusItem = document.createElement('div');
        statusItem.classList.add('extra-info-item');

        if (item.icon) {
          const iconElement = document.createElement('i');
          iconElement.classList.add('fas', item.icon);
          statusItem.appendChild(iconElement);
        }

        const valueElement = document.createElement('span');
        valueElement.dataset.statusId = item.id;
        valueElement.dataset.unit = item.unit;
        valueElement.dataset.decimal = item.decimal;
        valueElement.dataset.labels = item.labels;
        // Initialer Text
        valueElement.textContent = formatJS.formatValue(
          ioBrokerStates[item.id]?.val,
          item.unit,
          item.decimal,
          item.labels
        );

        statusItem.appendChild(valueElement);
        extraInfo.appendChild(statusItem);
      });

      // Index weiterschalten
      currentIndex += displayCount;
      if (currentIndex >= statusItems.length) {
        currentIndex = 0;
      }
    }

    displayStatus();

    if (statusItems.length > displayCount) {
      setInterval(displayStatus, 7000);
    }
  },

  /**
   * Öffnet ein Overlay, in dem detaillierte Einstellungen für das Gerät angezeigt und geändert werden können.
   *
   * - Zeigt ggf. Hardware-Infos, Extra-Controls (z. B. Farbpicker, Dimmer), Info-Felder und generische Controls an.
   * - Mit "OK" werden die Änderungen übernommen (applySettings).
   *
   * @function
   * @memberof mainDeviceJS
   * @param {DeviceDefinition} device - Gerätedaten.
   * @param {boolean} canWrite - Schreibrechte?
   * @returns {void}
   */
  openSettingsOverlay(device, canWrite) {
    const overlay = document.createElement('div');
    overlay.classList.add('settings-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('overlay-content');

    const overlayTitle = document.createElement('h2');
    overlayTitle.textContent = `${device.name}`;
    overlayContent.appendChild(overlayTitle);

    // Hardware-Infos
    if (device.hardware && device.hardware.length > 0) {
      mainDeviceJS.addHardwareInfo(overlayContent, device);
    }

    // Gerätespezifische Extra-Einstellungen
    switch (device.type) {
      case 'light':
        deviceLightsJS.addExtraLightControls(overlayContent, device, canWrite);
        break;
      case 'heater':
        deviceHeaterJS.addExtraHeaterControls(overlayContent, device, canWrite);
        break;
      case 'window':
        deviceWindowJS.addExtraWindowControls(overlayContent, device, canWrite);
        break;
    }

    // Zusätzliche Info-Felder
    if (device.info && device.info.length > 0) {
      mainDeviceJS.addDeviceInfo(overlayContent, device);
    }

    // Wenn es definierte Controls gibt (z. B. Buttons, Sliders), diese ins Overlay
    if (device.controls && device.controls.length > 0) {
      mainDeviceJS.addDeviceControlsToOverlay(overlayContent, device, canWrite);
    }

    // Button-Leiste (OK / Abbrechen)
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.disabled = !canWrite;
    if (canWrite) {
      okButton.onclick = () => {
        mainDeviceJS.applySettings(device, overlayContent);
        document.body.removeChild(overlay);
      };
    }

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Abbrechen';
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
    };

    buttonContainer.appendChild(okButton);
    buttonContainer.appendChild(cancelButton);
    overlayContent.appendChild(buttonContainer);

    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
  },

  /**
   * Zeigt Informationen zur Hardware (z.B. unreach, rssi, label, info etc.) im Einstellungs-Overlay an.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element, in das Infos eingefügt werden.
   * @param {DeviceDefinition} device - Gerätedaten mit Hardware-Array.
   * @returns {void}
   */
  addHardwareInfo(overlayContent, device) {
    const hardwareInfoContainer = document.createElement('div');
    hardwareInfoContainer.classList.add('hardware-info-container');

    device.hardware.forEach((hardwareComponent, index) => {
      const hardwareItem = document.createElement('div');
      hardwareItem.classList.add('hardware-item');

      // Nummer
      const infoNumber = document.createElement('span');
      infoNumber.classList.add('info-number');
      infoNumber.textContent = index + 1;

      // Label
      const labelElement = document.createElement('span');
      labelElement.classList.add('hardware-label');
      labelElement.textContent = formatJS.placeholderSubstitute(hardwareComponent.label || 'Hardware');

      hardwareItem.appendChild(infoNumber);
      hardwareItem.appendChild(labelElement);

      // Optionale Zusatzinfo
      if (hardwareComponent.info) {
        const additionalInfo = document.createElement('span');
        additionalInfo.classList.add('additional-info');
        additionalInfo.textContent = formatJS.placeholderSubstitute(hardwareComponent.info);
        hardwareItem.appendChild(additionalInfo);
      }

      hardwareInfoContainer.appendChild(hardwareItem);
    });

    overlayContent.appendChild(hardwareInfoContainer);
  },

  /**
   * Zeigt allgemeine Info-Felder (z. B. label, value, unit, decimal, error/warning) im Overlay an.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} overlayContent - Das Overlay-Element.
   * @param {DeviceDefinition} device - Gerätedaten mit info-Array.
   * @returns {void}
   */
  addDeviceInfo(overlayContent, device) {
    const deviceInfoContainer = document.createElement('div');
    deviceInfoContainer.classList.add('device-info-container');

    device.info.forEach(infoItem => {
      const infoRow = document.createElement('div');
      infoRow.classList.add('device-info-row');

      const labelElement = document.createElement('span');
      labelElement.classList.add('device-info-label');
      labelElement.textContent = infoItem.label || '';

      const valueElement = document.createElement('span');
      valueElement.classList.add('device-info-value');
      valueElement.dataset.id = infoItem.value;
      valueElement.dataset.format = JSON.stringify({
        unit: infoItem.unit,
        decimal: infoItem.decimal,
        error: infoItem.error || "",
        warning: infoItem.warning || "",
        labels: infoItem.labels
      });

      const val = ioBrokerStates[infoItem.value]?.val ?? "";
      valueElement.textContent = formatJS.formatValue(
        val,
        infoItem.unit,
        infoItem.decimal,
        infoItem.labels
      );

      // Conditional Formatting
      formatJS.applyConditionalFormatting(
        valueElement,
        val,
        infoItem.error,
        infoItem.warning
      );

      infoRow.appendChild(labelElement);
      infoRow.appendChild(valueElement);
      deviceInfoContainer.appendChild(infoRow);
    });

    overlayContent.appendChild(deviceInfoContainer);
  },

  /**
   * Fügt definierte Controls (Buttons, Booleans, Text, Number etc.) ins Einstellungs-Overlay ein.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} overlayContent - Overlay-Container.
   * @param {DeviceDefinition} device - Gerätedaten mit controls-Array.
   * @param {boolean} canWrite - Schreibrechte?
   * @returns {void}
   */
  addDeviceControlsToOverlay(overlayContent, device, canWrite) {
    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('controls-container');

    device.controls.forEach(control => {
      demoJS.addDemoValue(control.id, control.type, control); // Demo-Modus?
      switch (control.type || 'button') {
        case 'button':
          fieldsForDevicesJS.addButtonControl(controlsContainer, control, canWrite);
          break;
        case 'boolean':
          fieldsForDevicesJS.addBooleanControl(controlsContainer, control, canWrite);
          break;
        case 'text':
          fieldsForDevicesJS.addTextControl(controlsContainer, control, canWrite);
          break;
        case 'number':
          fieldsForDevicesJS.addNumberControl(controlsContainer, control, canWrite);
          break;
        case 'color':
          fieldsForDevicesJS.addColorControl(controlsContainer, control, canWrite);
          break;
        case 'list':
          fieldsForDevicesJS.addListControl(controlsContainer, control, canWrite);
          break;
        case 'colorList':
          fieldsForDevicesJS.addColorListControl(controlsContainer, control, canWrite);
          break;
        default:
          console.warn(`Control type "${control.type}" wird nicht unterstützt.`);
      }
    });

    overlayContent.appendChild(controlsContainer);
  },

  /**
   * Öffnet ein einzelnes Device-Item (z. B. Raum, Kategorie, Info) und
   * lädt die entsprechende JSON-Datei, um deren Inhalte (Geräte) darzustellen.
   *
   * @async
   * @function
   * @memberof mainDeviceJS
   * @param {string} name - Der Name/Bezeichner der Kachel / Device / Raum etc.
   * @param {string} type - Typ (z. B. "room", "function"), um die richtige JSON-Datei zu laden.
   * @param {string} jsonfile - Dateiname
   * @returns {Promise<void>}
   */
  async openItem(name, type, jsonfile) {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = '';
    ioBrokerJS.clearPageIds();

    // Verbindungssymbol
    const connectionIcon = document.createElement('i');
    connectionIcon.classList.add('fa', 'fa-network-wired', 'connection-icon');
    connectionIcon.style.color = (servConn._isConnected || isDemoVersion) ? 'green' : 'red';
    mainContent.appendChild(connectionIcon);

    mainDeviceJS.createTileMenuButton(mainContent, name, type, jsonfile);

    const title = document.createElement('h2');
    title.textContent = name;
    title.id = 'page-title';
    mainContent.appendChild(title);

    // Klick => klappen alle Kategorien in- oder aus
    title.addEventListener('click', () => {
      const categories = mainContent.querySelectorAll('.category');
      categories.forEach(categorySection => {
        const tiles = categorySection.querySelector('.tiles');
        const isCollapsed = categorySection.classList.contains('collapsed');
        const collapseIcon = categorySection.querySelector(".collapse-icon");
        collapseIcon.setAttribute('data-icon', isCollapsed ? 'angle-up' : 'angle-down');
        categorySection.classList.toggle('collapsed');
        tiles.style.maxHeight = isCollapsed ? tiles.scrollHeight + 'px' : '0';
      });
    });

    // Dateiname konstruieren
    const itemFileName = `${dashboardConfig.dataFolder}/devices/${type}/${jsonfile}.json?v=${dashboardVersion}`;

    try {
      const response = await fetch(itemFileName + "?v=" + dashboardVersion);
      if (response.ok) {
        const itemData = await response.json();
        mainDeviceJS.displayItemTiles(itemData);
      } else {
        console.log("Bitte Datei anlegen: " + itemFileName);
        mainDeviceJS.displayItemTiles([]);
      }
      if (isDemoVersion) {
        demoJS.addDemoUI(mainContent);
      }
    } catch (error) {
      console.error(`Fehler beim Laden der ${type}-Datei:`, error);
    }
  },

  /**
   * Erzeugt einen Button, der ein Overlay mit einer Liste aller vorhandenen
   * Kacheln (categoryTiles) öffnet. Klick auf einen Eintrag wechselt zum entsprechenden Item.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {HTMLElement} mainContent - Haupt-Container für den Button und das Overlay.
   * @param {string} currentTileName - Name der aktuell geöffneten Kachel.
   * @param {string} type - Typ (z. B. "room" oder "function").
   * @param {string} jsonfile - JSON Dateiname
   * @returns {void}
   */
  createTileMenuButton(mainContent, currentTileName, type, jsonfile) {
    const button = document.createElement('button');
    button.classList.add('tile-menu-toggle');

    const icon = document.createElement('i');
    icon.classList.add('fa', 'fa-bars');
    button.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = lastPage;
    button.appendChild(text);

    // Overlay
    const overlay = document.createElement('div');
    overlay.classList.add('tile-menu-overlay');
    overlay.style.display = 'none';

    // Alphabetisch sortieren
    const tilesSorted = [...categoryTiles].sort((a, b) => a.localeCompare(b));
    tilesSorted.forEach(tile => {
      const item = document.createElement('div');
      item.classList.add('tile-menu-item');
      item.textContent = tile;
      if (tile === currentTileName) {
        item.classList.add('disabled');
      } else {
        item.addEventListener('click', () => {
          if (!item.classList.contains('disabled')) {
            overlay.style.display = 'none';
            mainDeviceJS.openItem(tile, type, jsonfile);
          }
        });
      }
      overlay.appendChild(item);
    });

    // Klick => Overlay togglen
    button.addEventListener('click', () => {
      overlay.style.display = (overlay.style.display === 'none') ? 'flex' : 'none';
    });

    // Klick außerhalb => Overlay schließen
    document.addEventListener('click', (e) => {
      if (!overlay.contains(e.target) && e.target !== button && !button.contains(e.target)) {
        overlay.style.display = 'none';
      }
    });

    mainContent.appendChild(button);
    mainContent.appendChild(overlay);
  },

  /**
   * Zeigt die Inhalte (Kategorien + Geräte) an, indem es über das übergebene JSON-Array iteriert
   * und für jede Kategorie Kacheln erzeugt. Ruft intern addDeviceControls etc. auf.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {Object[]} data - Array von Kategorien (z. B. {category, collapsed, devices: [...]}).
   * @returns {void}
   */
  displayItemTiles(data) {
    const mainContent = document.querySelector('.main-content');

    data.forEach(category => {
      if (!mainDeviceJS.canUserSee(category)) {
        return;
      }
      const canWriteCategory = mainDeviceJS.canUserWriteCategory(category);

      const categorySection = document.createElement('section');
      categorySection.classList.add('category');
      if (category.collapsed) {
        categorySection.classList.add('collapsed');
      }

      // Titel
      if (category.category) {
        const categoryTitle = document.createElement('h3');

        const titleContainer = document.createElement('div');
        titleContainer.classList.add('category-title-container');

        const titleText = document.createElement('span');
        titleText.textContent = category.category;

        const icon = document.createElement('i');
        icon.classList.add('collapse-icon', 'fas');
        if (categorySection.classList.contains('collapsed')) {
          icon.classList.add('fa-angle-down');
        } else {
          icon.classList.add('fa-angle-up');
        }

        titleContainer.appendChild(titleText);
        titleContainer.appendChild(icon);
        categoryTitle.appendChild(titleContainer);
        categorySection.appendChild(categoryTitle);

        // Klick => klappen
        categoryTitle.addEventListener('click', () => {
          const isCollapsed = categorySection.classList.contains('collapsed');
          categorySection.classList.toggle('collapsed');
          tilesContainer.style.maxHeight = isCollapsed
            ? (tilesContainer.scrollHeight + 50) + 'px'
            : '0';

          const collapseIcon = categorySection.querySelector(".collapse-icon");
          collapseIcon.setAttribute('data-icon', isCollapsed ? 'angle-up' : 'angle-down');
        });
      }

      // Container für die Geräte-Kacheln
      const tilesContainer = document.createElement('div');
      tilesContainer.classList.add('tiles');

      category.devices.forEach(device => {
        if (!pageTypes.includes(device.type)) {
          pageTypes.push(device.type);
        }
        if (!mainDeviceJS.canUserSee(device)) {
          return;
        }
        const canWrite = mainDeviceJS.canUserWriteDevice(device, canWriteCategory);

        const tile = document.createElement('div');
        tile.classList.add('item-tile');

        // hidden-Logik
        if (device.hidden) {
          tile.dataset.hiddenId = device.hidden;
          ioBrokerJS.addPageId(device.hidden, 'hidden');
          const hiddenValue = ioBrokerStates[device.hidden]?.val ?? false;
          tile.style.display = (hiddenValue === true || hiddenValue === "true") ? 'none' : '';
        }

        // tile-content
        const tileContent = document.createElement('div');
        tileContent.classList.add('tile-content');

        if (device.dimmer) {
          tileContent.dataset.dimmerId = device.dimmer;
        }
        if (device.rgb) {
          tileContent.dataset.rgbId = device.rgb;
        }
        if (device.temperature) {
          tileContent.dataset.temperatureId = device.temperature;
        }

        // Falls Infos vorhanden, registriere diese
        if (device.info && device.info.length > 0) {
          device.info.forEach(infoItem => {
            ioBrokerJS.addPageId(infoItem.value, infoItem.unit);
          });
        }

        // Icon-Container
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('icon-container');
        tileContent.appendChild(iconContainer);

        // Batteriewarnung / RSSI / unreach
        deviceOthersJS.addLowbatIcon(tileContent, device);
        deviceOthersJS.addRssiUnreachIcon(tileContent, device);

        // Primäre Controls
        mainDeviceJS.addDeviceControls(tileContent, device, tile, canWrite);

        // Nur bei bestimmten Typen: Titel + Extra-Controls
        if (device.type !== "ioBroker_ical" && device.type !== "iframe") {
          const title = document.createElement('div');
          title.classList.add('tile-title');
          title.textContent = device.name;
          tileContent.appendChild(title);

          mainDeviceJS.addSecondaryDeviceControls(tileContent, device, canWrite);
          mainDeviceJS.addExtraDeviceControls(tileContent, device, canWrite);
        }

        tile.appendChild(tileContent);
        // Extra-Infos
        mainDeviceJS.addExtraInfo(tile, device);

        tilesContainer.appendChild(tile);
      });

      categorySection.appendChild(tilesContainer);
      mainContent.appendChild(categorySection);

      // Höhe anpassen
      requestAnimationFrame(() => {
        const height = tilesContainer.scrollHeight + 10;
        tilesContainer.style.maxHeight = categorySection.classList.contains('collapsed') ? '0' : height + 'px';
        tilesContainer.style.height = height + 'px';
      });
    });
  },

  /**
   * Prüft, ob der User auf diese Kategorie oder dieses Device zugreifen darf
   * (basierend auf authorization / authorization_read).
   *
   * @function
   * @memberof mainDeviceJS
   * @param {Object} item - Ein Category- oder Device-Objekt (mit authorization-Feldern).
   * @returns {boolean} Gibt true zurück, wenn der User Lesezugriff hat.
   */
  canUserSee(item) {
    if (!item.authorization && !item.authorization_read) {
      return true;
    }
    if (!userLoggedIn || userLoggedIn.trim() === '') {
      return false;
    }
    const inAuth = item.authorization && item.authorization.includes(userLoggedIn);
    const inAuthRead = item.authorization_read && item.authorization_read.includes(userLoggedIn);
    return inAuth || inAuthRead;
  },

  /**
   * Prüft, ob der User Schreibrechte (authorization, nicht nur authorization_read)
   * für die gesamte Kategorie hat.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {Object} item - Kategorie-Objekt mit authorization-Feldern.
   * @returns {boolean} true, wenn write-Autorisierung vorliegt.
   */
  canUserWriteCategory(item) {
    if (!item.authorization && !item.authorization_read) {
      return true;
    }
    if (!userLoggedIn || userLoggedIn.trim() === '') {
      return false;
    }
    return item.authorization && item.authorization.includes(userLoggedIn);
  },

  /**
   * Prüft, ob der User für ein einzelnes Gerät Schreibrechte hat.
   * Dies hängt von `canWriteCategory` ab, kann aber durch device-spezifische Felder
   * (authorization, authorization_read) überschrieben werden.
   *
   * @function
   * @memberof mainDeviceJS
   * @param {Object} item - Ein Device-Objekt.
   * @param {boolean} canWriteCategory - Gibt an, ob die übergeordnete Kategorie Schreibrechte gewährt.
   * @returns {boolean} true, wenn das Device geschrieben werden darf.
   */
  canUserWriteDevice(item, canWriteCategory) {
    if (canWriteCategory && !item.authorization && !item.authorization_read) {
      return true;
    }
    if (canWriteCategory && item.authorization_read && item.authorization_read.includes(userLoggedIn)) {
      return false;
    }
    if (!canWriteCategory && item.authorization && item.authorization.includes(userLoggedIn)) {
      return true;
    }
    return false;
  }
};
