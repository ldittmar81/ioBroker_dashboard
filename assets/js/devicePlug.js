/**
 * Das Modul devicePlugJS enthält Funktionen zum Anzeigen und Steuern
 * von Zwischensteckern (Plugs). Diese können als einfaches Ein-/Ausschaltgerät
 * dargestellt werden (z. B. als Bild oder als Toggle-Switch).
 *
 * @namespace devicePlugJS
 */
const devicePlugJS = {

  /**
   * @typedef {Object} PlugDeviceDefinition
   * @property {string} value - State-ID, die den aktuellen Zustand (true/false) widerspiegelt.
   * @property {string} [imageOn] - (Optional) Dateiname des Bildes, das angezeigt wird, wenn der Plug an ist.
   * @property {string} [imageOff] - (Optional) Dateiname des Bildes, das angezeigt wird, wenn der Plug aus ist.
   * @property {string} [rgb] - (Optional) CSS-Farbwert (z. B. #ff0000) für den Toggle-Switch.
   * // ... weitere Felder nach Bedarf
   */

  /**
   * Erstellt ein Plug-UI-Element (Entweder ein Bild oder einen Toggle-Switch)
   * und fügt es dem `tileContent` hinzu. Das Element reagiert bei Schreibrechten (`canWrite`)
   * auf Klicks bzw. Toggle-Events und sendet den neuen Zustand an ioBroker.
   *
   * - Wenn `device.imageOn` oder `device.imageOff` definiert sind,
   *   wird ein `<img>` mit entsprechendem Bild für An/Aus erstellt.
   * - Ansonsten wird ein `<input type="checkbox">`-Toggle-Switch erzeugt.
   * - Registriert die State-ID (`device.value`) via `ioBrokerJS.addPageId(device.value, 'boolean')`.
   * - Liest den Initialzustand aus `ioBrokerStates[device.value]?.val` und setzt
   *   das entsprechende Bild oder den Switch-Status.
   *
   * @function
   * @memberof devicePlugJS
   * @param {HTMLElement} tileContent - Das DOM-Element (z. B. eine Kachel), in das das Plug-Element eingefügt wird.
   * @param {PlugDeviceDefinition} device - Objekt mit den Geräteeinstellungen (z. B. `imageOn`, `imageOff`, `value`).
   * @param {boolean} canWrite - Gibt an, ob der Nutzer Schreibrechte für das Plug hat.
   * @returns {void}
   */
  addPlugControls(tileContent, device, canWrite) {
    const plugContainer = document.createElement('div');
    plugContainer.classList.add('plug-device-container');

    let plugElement;

    // Wenn eigene Bilder vorhanden sind, verwende <img>
    if (device.imageOn || device.imageOff) {
      plugElement = document.createElement('img');
      plugElement.classList.add('plug-image');
      plugElement.dataset.id = device.value;

      // data-image-on / data-image-off zuweisen
      if (device.imageOn) {
        plugElement.dataset.imageOn = device.imageOn;
      }
      if (device.imageOff) {
        plugElement.dataset.imageOff = device.imageOff;
      }

      // Initiales Bild anhand des aktuellen Zustands festlegen
      const initialState = ioBrokerStates[device.value]?.val;
      if (formatJS.isTrue(initialState)) {
        if (plugElement.dataset.imageOn) {
          plugElement.src = `assets/img/devices/plug/${plugElement.dataset.imageOn}`;
        }
      } else {
        if (plugElement.dataset.imageOff) {
          plugElement.src = `assets/img/devices/plug/${plugElement.dataset.imageOff}`;
        }
      }

      // Klick-Event nur, wenn canWrite = true
      if (canWrite) {
        plugElement.addEventListener('click', function () {
          const newState = !formatJS.isTrue(ioBrokerStates[device.value]?.val);
          ioBrokerJS.sendCommand(device.value, newState);
        });
      } else {
        plugElement.style.cursor = 'not-allowed';
      }

      // Seite abonnieren (State-ID registrieren)
      ioBrokerJS.addPageId(device.value, 'boolean');

    } else {
      // Kein eigenes Bild => Standard Toggle Switch
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.classList.add('toggle-switch');
      toggleInput.dataset.id = device.value;
      toggleInput.disabled = !canWrite;

      const toggleLabel = document.createElement('label');
      toggleLabel.classList.add('toggle-label');

      const toggleSlider = document.createElement('span');
      toggleSlider.classList.add('slider');

      if (!canWrite) {
        toggleSlider.classList.add('readonly');
      }

      // Falls device.rgb existiert, Hintergrundfarbe setzen
      if (device.rgb) {
        toggleSlider.style.backgroundColor = device.rgb;
      }

      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(toggleSlider);

      if (canWrite) {
        toggleInput.addEventListener('change', function () {
          const newState = this.checked;
          ioBrokerJS.sendCommand(device.value, newState);
        });
      }

      // State-ID registrieren
      ioBrokerJS.addPageId(device.value, 'boolean');

      // Initialzustand
      const initialState = ioBrokerStates[device.value]?.val;
      toggleInput.checked = formatJS.isTrue(initialState);

      plugElement = toggleLabel;
    }

    plugContainer.appendChild(plugElement);
    tileContent.insertBefore(plugContainer, tileContent.querySelector('.tile-title'));
  }
};
