/**
 * Das Modul deviceOthersJS fasst verschiedene Hilfsfunktionen zusammen,
 * um zusätzliche Geräteicons wie RSSI/Signalstärke, "unreach" (Erreichbarkeit)
 * oder "low battery" (Batteriewarnung) in einer Kachel anzuzeigen.
 *
 * @namespace deviceOthersJS
 */
const deviceOthersJS = {

  /**
   * @typedef {Object} HardwareComponentDefinition
   * @property {string} [unreach] - State-ID, die angibt, ob das Gerät nicht erreichbar ist (boolean).
   * @property {string} [rssi] - State-ID für die Signalstärke (z. B. Wert zwischen -100 und 0).
   * @property {string} [lowbat] - State-ID für niedrigen Batteriestand (boolean).
   */

  /**
   * @typedef {Object} DeviceDefinition
   * @property {string} [name] - Anzeigename des Geräts (optional).
   * @property {HardwareComponentDefinition[]} [hardware] - Array von Hardware-Komponenten,
   *    die u. a. `unreach`, `rssi`, `lowbat` enthalten können.
   * // ... weitere Felder nach Bedarf
   */

  /**
   * Fügt in der übergebenen Kachel (`tile`) je nach `device.hardware` kleine Icons
   * für "unreach" und "RSSI" (Signalstärke) hinzu.
   *
   * - Falls mehrere Hardware-Komponenten vorhanden sind, wird bei jedem Icon
   *   eine Nummer angezeigt.
   * - Die Icons werden rechts im Kachel-Header eingefügt (in ein Element `.right-icons`).
   * - Registriert die State-IDs für `unreach` und `rssi` per `ioBrokerJS.addPageId`.
   * - Ruft `updateUnreachIcon` auf, um das korrekte Icon zu setzen.
   *
   * @function
   * @memberof deviceOthersJS
   * @param {HTMLElement} tile - Das Kachel-Element (z. B. `<div class="tile-content">`).
   * @param {DeviceDefinition} device - Objekt mit möglichen Hardware-Komponenten (unreach/rssi).
   * @returns {void}
   */
  addRssiUnreachIcon(tile, device) {
    if (!device.hardware || device.hardware.length === 0) return;

    const iconContainer = tile.querySelector('.icon-container');
    let rightIcons = iconContainer.querySelector('.right-icons');
    if (!rightIcons) {
      rightIcons = document.createElement('div');
      rightIcons.classList.add('right-icons');
      iconContainer.appendChild(rightIcons);
    }

    device.hardware.forEach((hardwareComponent, index) => {
      const unreachId = hardwareComponent.unreach;
      const rssiId = hardwareComponent.rssi;

      if (!unreachId && !rssiId) return;

      const signalContainer = document.createElement('div');
      signalContainer.classList.add('device-icon');
      signalContainer.dataset.unreach = unreachId;
      signalContainer.dataset.rssi = rssiId;

      // Falls mehrere Hardware-Komponenten existieren, eine Nummer einblenden
      if (device.hardware.length > 1) {
        const infoNumber = document.createElement('span');
        infoNumber.classList.add('info-number');
        infoNumber.textContent = index + 1;
        signalContainer.appendChild(infoNumber);
      }

      // IDs registrieren
      ioBrokerJS.addPageId(unreachId, 'boolean');
      ioBrokerJS.addPageId(rssiId, 'rssi');

      // Initiales Icon setzen
      deviceOthersJS.updateUnreachIcon(signalContainer);

      rightIcons.appendChild(signalContainer);
    });
  },

  /**
   * Aktualisiert das Icon in `signalContainer` abhängig von den Werten
   * der State-IDs `unreach` und `rssi`.
   *
   * - Wenn `unreach` true ist, wird ein "kein Signal"-Icon (`rssi0.png`) angezeigt.
   * - Sonst wird basierend auf `rssi`-Werten zwischen z. B. -100 und 0 eines von
   *   mehreren Icons (`rssi1.png` bis `rssi4.png`) ausgewählt.
   *
   * @function
   * @memberof deviceOthersJS
   * @param {HTMLDivElement} signalContainer - Das DOM-Element, in dem das RSSI-Icon gesetzt wird.
   * @returns {void}
   */
  updateUnreachIcon(signalContainer) {
    const unreachId = signalContainer.dataset.unreach;
    const rssiId = signalContainer.dataset.rssi;

    const unreachValue = unreachId ? ioBrokerStates[unreachId]?.val : false;
    const rssiValue = rssiId ? ioBrokerStates[rssiId]?.val : null;

    if (unreachValue && unreachValue !== "false") {
      signalContainer.style.backgroundImage = 'url(assets/img/devices/rssi0.png)';
    } else if (rssiValue !== null) {
      if (rssiValue < -70) {
        signalContainer.style.backgroundImage = 'url(assets/img/devices/rssi1.png)';
      } else if (rssiValue >= -70 && rssiValue < -60) {
        signalContainer.style.backgroundImage = 'url(assets/img/devices/rssi2.png)';
      } else if (rssiValue >= -60 && rssiValue < -50) {
        signalContainer.style.backgroundImage = 'url(assets/img/devices/rssi3.png)';
      } else if (rssiValue >= -50) {
        signalContainer.style.backgroundImage = 'url(assets/img/devices/rssi4.png)';
      }
    } else {
      // Falls kein Wert vorliegt, kein Icon anzeigen
      signalContainer.style.backgroundImage = '';
    }
  },

  /**
   * Prüft, ob `device.hardware` Einträge mit `lowbat` enthalten. Falls ja,
   * wird links in der Kachel (in `.left-icons`) ein Battery-Icon (`lowbat.png`) eingeblendet.
   *
   * - Zeigt das Icon nur an, wenn `lowbat === true`.
   * - Falls mehrere Hardware-Komponenten, wird eine kleine Nummer am Icon eingeblendet.
   *
   * @function
   * @memberof deviceOthersJS
   * @param {HTMLElement} tile - Das Kachel-Element.
   * @param {DeviceDefinition} device - Gerätedaten mit möglichen `lowbat`-IDs.
   * @returns {void}
   */
  addLowbatIcon(tile, device) {
    if (!device.hardware || device.hardware.length === 0) return;

    // iconContainer erstellen, falls nicht vorhanden
    const iconContainer = tile.querySelector('.icon-container') || document.createElement('div');
    if (!iconContainer.parentNode) {
      iconContainer.classList.add('icon-container');
      tile.appendChild(iconContainer);
    }

    // left-icons erstellen, falls nicht vorhanden
    let leftIcons = iconContainer.querySelector('.left-icons') || document.createElement('div');
    if (!leftIcons.parentNode) {
      leftIcons.classList.add('left-icons');
      iconContainer.appendChild(leftIcons);
    }

    device.hardware.forEach((hardwareComponent, index) => {
      const lowbatId = hardwareComponent.lowbat;
      if (!lowbatId) return;

      const lowbatIcon = document.createElement('div');
      lowbatIcon.classList.add('lowbat-icon');
      lowbatIcon.dataset.lowbat = lowbatId;
      lowbatIcon.style.backgroundImage = 'url(assets/img/devices/lowbat.png)';

      if (device.hardware.length > 1) {
        const infoNumber = document.createElement('span');
        infoNumber.classList.add('info-number');
        infoNumber.textContent = index + 1;
        lowbatIcon.appendChild(infoNumber);
      }

      // Registriere ID
      ioBrokerJS.addPageId(lowbatId, 'boolean');

      const lowbatValue = ioBrokerStates[lowbatId]?.val;
      // Ist `lowbatValue` true, wird das Icon gezeigt, sonst versteckt
      if (lowbatValue) {
        lowbatIcon.style.display = "";
      } else {
        lowbatIcon.style.display = "none";
      }

      leftIcons.appendChild(lowbatIcon);
    });
  }
};
