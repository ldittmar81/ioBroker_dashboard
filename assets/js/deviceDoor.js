/**
 * Das Modul deviceDoorJS enthält Logik zum Darstellen und Aktualisieren von Türen
 * (inklusive optionalem Schloss) im Dashboard.
 *
 * - Eine Tür kann offen oder geschlossen sein (Boolean-Wert).
 * - Optional kann ein Schloss-Icon angezeigt werden (z. B. lock/unlock).
 *
 * @namespace deviceDoorJS
 */
const deviceDoorJS = {

  /**
   * @typedef {Object} DoorDeviceDefinition
   * @property {string} value - State-ID für den Türstatus (Boolean: offen/geschlossen).
   * @property {string} [lock] - (Optional) State-ID für den Schloss-Status (Boolean: verriegelt/offen).
   * @property {string} [name] - (Optional) Anzeigename der Tür (wird hier nicht zwingend genutzt).
   */

  /**
   * Erzeugt das DOM-Element für eine Türanzeige und fügt es der angegebenen Kachel (`tileContent`) hinzu.
   *
   * - Fügt ein zentrales Tür-Icon hinzu, das je nach Wert (`device.value`) offen oder geschlossen angezeigt wird.
   * - Wenn `device.lock` vorhanden ist, wird zusätzlich ein Schloss-Icon eingefügt (offen oder geschlossen).
   * - Registriert die State-IDs via `ioBrokerJS.addPageId(...)`, damit UI-Updates erfolgen können.
   *
   * @function
   * @memberof deviceDoorJS
   * @param {HTMLElement} tileContent - Das Container-Element (z. B. eine Kachel), in das das Tür-Icon eingefügt wird.
   * @param {DoorDeviceDefinition} device - Objekt mit den Tür-/Schloss-Informationen (z. B. `value`, `lock`).
   * @returns {void}
   */
  addDoorControls(tileContent, device) {

    const mainIcon = document.createElement('div');
    mainIcon.classList.add('main-icon');

    // Speichere die State-ID (Tür)
    mainIcon.dataset.id = device.value;
    ioBrokerJS.addPageId(device.value, 'boolean');

    // Aktueller Wert aus den States lesen
    const doorState = ioBrokerStates[device.value]?.val;
    mainIcon.dataset.oldValue = doorState;

    // Icon für Tür offen/geschlossen
    if (formatJS.isTrue(doorState)) {
      mainIcon.style.backgroundImage = 'url(assets/img/devices/door/door_open.png)';
    } else {
      mainIcon.style.backgroundImage = 'url(assets/img/devices/door/door_close.png)';
    }

    // Wenn ein Lock-State angegeben ist, füge das Schloss-Icon hinzu
    if (device.lock) {
      ioBrokerJS.addPageId(device.lock, 'boolean');

      const lockIcon = document.createElement('i');
      lockIcon.classList.add('lock-icon');
      lockIcon.dataset.lockId = device.lock;

      const lockState = ioBrokerStates[device.lock]?.val;
      lockIcon.dataset.oldValue = lockState;
      lockIcon.classList.add('fas'); // Font Awesome Basisklasse

      if (formatJS.isTrue(lockState)) {
        lockIcon.classList.add('fa-lock'); // Geschlossenes Schloss
      } else {
        lockIcon.classList.add('fa-lock-open'); // Offenes Schloss
      }

      mainIcon.appendChild(lockIcon);
    }

    // Füge das Tür-Icon vor dem Titel-Element ein (falls vorhanden)
    tileContent.insertBefore(mainIcon, tileContent.querySelector('.tile-title'));
  },

  /**
   * Aktualisiert das Tür-Icon (z. B. in einem Update-Zyklus),
   * wenn sich der Wert von "zu → offen" oder "offen → zu" ändert.
   *
   * - Liest die aktuelle State-ID aus `mainIcon.dataset.id`.
   * - Vergleicht den alten Wert (`mainIcon.dataset.oldValue`) mit dem aktuellen Wert aus `ioBrokerStates`.
   * - Passt das Hintergrundbild entsprechend an (door_open oder door_close).
   * - Schreibt den neuen Wert in `mainIcon.dataset.oldValue`, wenn sich etwas geändert hat.
   *
   * @function
   * @memberof deviceDoorJS
   * @param {HTMLDivElement} mainIcon - Das DOM-Element, welches die `main-icon`-Klasse trägt und `data-id` enthält.
   * @returns {void}
   */
  updateDoorIcon(mainIcon) {
    const doorId = mainIcon.dataset.id;
    const oldValue = formatJS.isTrue(mainIcon.dataset.oldValue);
    const doorState = formatJS.isTrue(ioBrokerStates[doorId]?.val);

    if (oldValue !== doorState) {
      if (doorState) {
        mainIcon.style.backgroundImage = 'url(assets/img/devices/door/door_open.png)';
      } else {
        mainIcon.style.backgroundImage = 'url(assets/img/devices/door/door_close.png)';
      }
      // Aktualisiere den gespeicherten alten Wert
      mainIcon.dataset.oldValue = doorState ? 'true' : 'false';
    }
  },

  /**
   * Aktualisiert das Schloss-Icon (Lock) basierend auf dem Wert von `lockIcon.dataset.lockId`.
   *
   * - Vergleicht den alten Wert (`lockIcon.dataset.oldValue`) mit dem aktuellen Wert aus `ioBrokerStates`.
   * - Entfernt ggf. die Klassen `fa-lock` und `fa-lock-open`, um dann die neue Klasse zu setzen.
   * - Schreibt den neuen Wert in `lockIcon.dataset.oldValue`.
   *
   * @function
   * @memberof deviceDoorJS
   * @param {HTMLElement} lockIcon - Das Schloss-Icon (z. B. `<i class="lock-icon">`).
   * @returns {void}
   */
  updateLockIcon(lockIcon) {
    const lockId = lockIcon.dataset.lockId;
    const oldValue = formatJS.isTrue(lockIcon.dataset.oldValue);
    const lockState = formatJS.isTrue(ioBrokerStates[lockId]?.val);

    if (oldValue !== lockState) {
      lockIcon.classList.remove('fa-lock', 'fa-lock-open');
      if (lockState) {
        lockIcon.classList.add('fa-lock'); // Geschlossen
      } else {
        lockIcon.classList.add('fa-lock-open'); // Offen
      }
      lockIcon.dataset.oldValue = lockState ? 'true' : 'false';
    }
  }
};
