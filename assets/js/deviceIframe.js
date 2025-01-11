/**
 * Das Modul deviceIframeJS stellt Funktionen bereit, um ein Iframe
 * (z. B. eine externe Seite oder einen eingebetteten Inhalt) in einer Kachel anzuzeigen.
 *
 * @namespace deviceIframeJS
 */
const deviceIframeJS = {

  /**
   * @typedef {Object} IframeDeviceDefinition
   * @property {string} page - Die URL, die im Iframe geladen werden soll.
   * @property {string} html - State-ID in ioBroker, die den HTML-Text enthält.
   * @property {string} [name] - Ein optionaler Titel, der über dem Iframe angezeigt wird.
   */

  /**
   * Fügt ein Iframe in das übergebene Container-Element (`tileContent`) ein.
   * - Zeigt, wenn vorhanden, den `device.name` als Überschrift (`<h3>`).
   * - Erzeugt ein `<iframe>`-Element mit voller Breite/Höhe und ohne Rahmen.
   *
   * @function
   * @memberof deviceIframeJS
   * @param {HTMLElement} tileContent - Das DOM-Element (z.B. eine Kachel), in das das Iframe eingefügt wird.
   * @param {IframeDeviceDefinition} device - Objekt mit den Informationen für das Iframe (z. B. URL).
   * @returns {void}
   */
  addIframeControls(tileContent, device) {
    if (device.name) {
      const title = document.createElement('h3');
      title.textContent = device.name;
      tileContent.appendChild(title);
    }

    if (device.page) {
      const iframe = document.createElement('iframe');
      iframe.src = device.page;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';

      tileContent.appendChild(iframe);
    } else if (device.html) {
      ioBrokerJS.addPageId(device.html, 'html');

      const htmlContent = document.createElement('div');
      htmlContent.classList.add('html-content');
      htmlContent.innerHTML = ioBrokerStates[device.html]?.val ?? '';
      htmlContent.dataset.htmlId = device.html;

      tileContent.appendChild(htmlContent);
    }
  }
};
