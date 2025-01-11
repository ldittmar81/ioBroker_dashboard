/**
 * Das Modul deviceButtonJS enthält Logik zur Erstellung von Geräte-Buttons,
 * die entweder als Bild (<img>) oder als <button> angezeigt werden können.
 *
 * @namespace deviceButtonJS
 */
const deviceButtonJS = {

  /**
   * @typedef {Object} DeviceDefinition
   * @property {string} [image] - Pfad oder Dateiname für ein Bild (wird anstelle eines Buttons benutzt).
   * @property {string} [name] - Anzeigename des Buttons (z. B. alt-Text oder Tooltip).
   * @property {string} value - Die State-ID oder der Key, an den ein Befehl gesendet wird (z. B. "alias.0.lampe.power").
   * @property {string} [icon] - Falls `image` nicht vorhanden ist, wird ein <button> mit diesem Icon (Font Awesome) angezeigt.
   * @property {string} [rgb] - Hex-Farbwert (z. B. "#ff0000") oder CSS-Farbangabe, um den Buttonhintergrund zu setzen.
   */

  /**
   * Erstellt ein Button- bzw. Bild-Element und fügt es der angegebenen Tile hinzu.
   * - Wenn `device.image` definiert ist, wird ein <img>-Element erzeugt.
   * - Ansonsten wird ein <button> mit (optionalem) Icon erstellt.
   * - Ist `canWrite = true`, wird ein Click-Eventlistener registriert, der
   *   `ioBrokerJS.sendCommand(device.value, true)` aufruft.
   *
   * @function
   * @memberof deviceButtonJS
   * @param {HTMLElement} tileContent - Der Container (z. B. ein DOM-Element einer Kachel).
   * @param {DeviceDefinition} device - Objekt mit den Geräteeinstellungen (z. B. `image`, `icon`, `value`, etc.).
   * @param {boolean} canWrite - Gibt an, ob Schreibrechte vorhanden sind (true = Button ist aktiv).
   * @returns {void}
   */
  addButtonControls(tileContent, device, canWrite) {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-device-container');

    let actionElement;

    // Wenn 'image' vorhanden ist, verwende ein <img>-Element
    if (device.image) {
      actionElement = document.createElement('img');
      actionElement.classList.add('action-button-image');
      actionElement.src = `assets/img/devices/button/${device.image}`;
      actionElement.alt = device.name || 'Button';
      if (!canWrite) {
        actionElement.style.cursor = 'not-allowed';
      }
    } else {
      // Verwende ein <button>-Element
      actionElement = document.createElement('button');
      actionElement.classList.add('action-button');

      actionElement.disabled = !canWrite;

      // Hintergrundfarbe setzen, wenn 'rgb' vorhanden ist
      if (device.rgb) {
        actionElement.style.backgroundColor = device.rgb;
      }

      // Wenn 'icon' vorhanden ist, verwende es
      const iconElement = document.createElement('i');
      if (device.icon) {
        iconElement.classList.add('fas', device.icon);
      } else {
        iconElement.classList.add('fas', 'fa-hockey-puck');
      }
      actionElement.appendChild(iconElement);
    }

    if (canWrite) {
      // Event Listener hinzufügen
      actionElement.addEventListener('click', () => {
        // Visuelles Feedback
        actionElement.classList.add('clicked');
        setTimeout(() => {
          actionElement.classList.remove('clicked');
        }, 300);

        // Sendet den Befehl an ioBroker
        ioBrokerJS.sendCommand(device.value, true);
      });
    }

    buttonContainer.appendChild(actionElement);
    tileContent.insertBefore(buttonContainer, tileContent.querySelector('.tile-title'));
  }

};
