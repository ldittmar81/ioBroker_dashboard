/**
 * Das Modul mainUpdaterJS verwaltet die Aktualisierung der UI-Elemente
 * bei State-Änderungen. Wenn sich ein bestimmter State ändert, wird die Methode
 * `updateUIForID(id, state)` aufgerufen, die dann je nach Gerätekategorien (pageTypes)
 * die passenden Aktualisierungsfunktionen anstößt (Licht, Heizung, Fenster, usw.).
 *
 * @namespace mainUpdaterJS
 */
const mainUpdaterJS = {

  /**
   * Wird aufgerufen, wenn ein bestimmter State (ID) sich geändert hat.
   * Enthält die Logik, um in Abhängigkeit der `pageTypes`-Liste
   * die spezifische Update-Routine (Licht, Heizung, Fenster, usw.) auszuführen.
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - Die State-ID, die sich geändert hat.
   * @param {object} state - Das neue State-Objekt. Erwartet mindestens ein Feld `val`.
   *   z. B. `{ val: any, ack: boolean, ts: number, ... }`
   * @returns {void}
   */
  updateUIForID(id, state) {
    const value = state?.val ?? "";

    // Sichtbarkeit aktualisieren (Kacheln aus- oder einblenden)
    mainUpdaterJS.updateHiddenElements(id, value);

    if (pageTypes.includes("room")) {
      // Raum-spezifische Aktualisierung (z. B. einfache Statusanzeige)
      mainUpdaterJS.updateRoomStates(id, value);
    } else {
      // Extra-Info-Elemente aktualisieren
      mainUpdaterJS.updateExtraInfo(id, value);
      // RSSI, unreach, lowbat etc.
      mainUpdaterJS.updateUnreachAndLowbat(id, value);

      // Falls bestimmte Gerätetypen existieren, deren Update-Routinen anstoßen
      if (pageTypes.includes("plug")) mainUpdaterJS.updatePlug(id, value);
      if (pageTypes.includes("light")) mainUpdaterJS.updateLight(id, value);
      if (pageTypes.includes("heater")) mainUpdaterJS.updateHeater(id, value);
      if (pageTypes.includes("window")) mainUpdaterJS.updateWindow(id);
      if (pageTypes.includes("temperature")) mainUpdaterJS.updateThermometerAndHygrometer(id);
      if (pageTypes.includes("media")) mainUpdaterJS.updateMedia(id, value);
      if (pageTypes.includes("door")) mainUpdaterJS.updateDoor(id);
      if (pageTypes.includes("iframe")) mainUpdaterJS.updateHTMLContent(id, value);
    }
  },

  /**
   * Aktualisiert den UI-Zustand für Fenster:
   * - Fensterstatus (offen/zu/gekipp) anhand `data-state-id`.
   * - Rollladenposition anhand `data-id`.
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID, die sich geändert hat.
   * @returns {void}
   */
  updateWindow(id) {
    // Fensterzustand aktualisieren
    document.querySelectorAll(`.window-tile .main-icon[data-state-id="${id}"]`).forEach(mainIcon => {
      deviceWindowJS.updateWindowIcon(mainIcon);
    });

    // Rollladenposition aktualisieren
    document.querySelectorAll(`.window-tile .main-icon[data-id="${id}"]`).forEach(mainIcon => {
      deviceWindowJS.updateShutterPosition(mainIcon);
    });
  },

  /**
   * Aktualisiert die Anzeige bei einer Heizung (Symbol, Temperaturanzeige).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID der Heizung (z. B. Heater-Wert).
   * @param {*} value - Neuer Wert (Temperatur, boolean oder Zahl).
   * @returns {void}
   */
  updateHeater(id, value) {
    // Heizungssymbole aktualisieren (z. B. Glühen an/aus)
    document.querySelectorAll(`.heater-tile .main-icon[data-id="${id}"]`).forEach(mainIcon => {
      deviceHeaterJS.updateHeaterIcon(mainIcon, value);
    });

    // Eingestellte Temperaturanzeige aktualisieren (second-display)
    document.querySelectorAll(`.heater-tile .second-display[data-set="${id}"]`).forEach(display => {
      display.textContent = value + " °C";
    });
  },

  /**
   * Blendet Elemente (z. B. Kacheln) aus oder ein, abhängig vom Wert
   * (z. B. wenn hidden==true → nicht anzeigen).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID für hidden.
   * @param {*} value - Aktueller Wert (true/false).
   * @returns {void}
   */
  updateHiddenElements(id, value) {
    document.querySelectorAll(`.item-tile[data-hidden-id="${id}"], .tile[data-hidden-id="${id}"]`)
      .forEach(tile => {
        tile.style.display = formatJS.isTrue(value) ? 'none' : '';
      });
  },

  /**
   * Aktualisiert Textinhalte in `span[data-id]`-Elementen
   * (z. B. allgemeine Raum-Anzeigen: Lampen an, Temperatur etc.).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID
   * @param {*} value - Neuer Wert des States
   * @returns {void}
   */
  updateRoomStates(id, value) {
    document.querySelectorAll(`span[data-id="${id}"]`).forEach(span => {
      const formatData = span.dataset.format ? JSON.parse(span.dataset.format) : {};
      span.textContent = formatJS.formatValue(value, formatData.unit, formatData.decimal, formatData.labels);

      const tile = span.closest(".tile");
      formatJS.applyConditionalFormatting(
        span.parentElement,
        value,
        formatData.error,
        formatData.warning,
        formatData.alarm,
        tile
      );
    });
  },

  /**
   * Aktualisiert zusätzliche Infoelemente in `.extra-info` (bzw. `.extra-info-item`).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID
   * @param {*} value - Neuer Wert
   * @returns {void}
   */
  updateExtraInfo(id, value) {
    document.querySelectorAll(`.extra-info-item span[data-status-id="${id}"]`).forEach(valueElement => {
      const decimal = Number(valueElement.dataset.decimal);
      const unit = valueElement.dataset.unit;
      const labels = valueElement.dataset.labels;
      valueElement.textContent = formatJS.formatValue(value, unit, decimal, labels);
    });
  },

  /**
   * Aktualisiert Steckdosen (Plug), z.B. zeigt Ein-/Aus-Bilder oder schaltet Toggle-Switches.
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID der Steckdose.
   * @param {*} value - Neuer Wert (true/false).
   * @returns {void}
   */
  updatePlug(id, value) {
    document.querySelectorAll(`.plug-tile [data-id="${id}"]`).forEach(plugElement => {
      const isChecked = (value === true || value === 'true');

      // Wenn <img> => setze src
      if (plugElement.tagName.toLowerCase() === 'img') {
        if (isChecked && plugElement.dataset.imageOn) {
          plugElement.src = `assets/img/devices/plug/${plugElement.dataset.imageOn}`;
        } else if (!isChecked && plugElement.dataset.imageOff) {
          plugElement.src = `assets/img/devices/plug/${plugElement.dataset.imageOff}`;
        }
      }
      // Toggle-Switch
      else if (plugElement.classList.contains('toggle-switch')) {
        plugElement.checked = isChecked;
      }
    });
  },

  /**
   * Aktualisiert Türgeräte (Tür offen/zu, Schlossstatus).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID (Tür oder Schloss).
   * @returns {void}
   */
  updateDoor(id) {
    // Türzustand
    document.querySelectorAll(`.door-tile .main-icon[data-id="${id}"]`).forEach(mainIcon => {
      deviceDoorJS.updateDoorIcon(mainIcon);
    });
    // Schlosszustand
    document.querySelectorAll(`.door-tile .lock-icon[data-lock-id="${id}"]`).forEach(lockIcon => {
      deviceDoorJS.updateLockIcon(lockIcon);
    });
  },

  /**
   * Aktualisiert RSSI-, unreach- und lowbat-Status (z. B. `deviceOthersJS`).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID
   * @param {*} value - Neuer Wert
   * @returns {void}
   */
  updateUnreachAndLowbat(id, value) {
    // unreach/rssi
    document.querySelectorAll(`.device-icon[data-unreach="${id}"], .device-icon[data-rssi="${id}"]`)
      .forEach(signalContainer => {
        deviceOthersJS.updateUnreachIcon(signalContainer);
      });

    // lowbat
    document.querySelectorAll(`.lowbat-icon[data-lowbat="${id}"]`).forEach(lowbatIcon => {
      lowbatIcon.style.display = value ? '' : 'none';
    });
  },

  /**
   * Aktualisiert Lichter (Dimmer, an/aus, Farbwerte).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID für das Licht.
   * @param {*} value - Neuer Wert (z. B. 0–100 für Dimmer).
   * @returns {void}
   */
  updateLight(id, value) {
    // Einfaches Licht (kein Dimmer)
    document.querySelectorAll(`.light-tile .main-icon:not(.dimmer-light)[data-id="${id}"]`)
      .forEach(mainIcon => {
        deviceLightsJS.updateLights(mainIcon, id, value);
      });

    document.querySelectorAll(`.light-tile .dimmer-light[data-id="${id}"]`)
      .forEach(mainIcon => {
        const tile = mainIcon.closest('.tile-content');
        deviceLightsJS.updateLightValues(tile, {});
      });

    // Dimmer
    document.querySelectorAll(`.light-tile .tile-content[data-dimmer-id="${id}"]`)
      .forEach(tile => {
        const values = {dimmer: value};
        deviceLightsJS.updateLightValues(tile, values);
      });
  },

  /**
   * Aktualisiert Mediengeräte (z. B. Player-Status, Lautstärke, Coverbild).
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID (z. B. play, pause, volume, progress).
   * @param {*} value - Neuer Wert
   * @returns {void}
   */
  updateMedia(id, value) {
    // Media-Icons (hauptsächlich Ein-/Aus)
    document.querySelectorAll(`.media-tile .main-icon[data-id="${id}"]`).forEach(mainIcon => {
      const isActive = (value === true || value === 'true');
      const imageOffPic = mainIcon.dataset.imageOff;
      if (!isActive) {
        mainIcon.style.backgroundImage = `url('assets/img/devices/media/${imageOffPic}')`;
      } else {
        setTimeout(() => {
          const imageOnPic = ioBrokerStates[mainIcon.dataset.imageOn]?.val || ('assets/img/devices/media/' + imageOffPic);
          mainIcon.style.backgroundImage = `url('${imageOnPic}')`;
        }, 100);
      }
    });

    // Dynamisches Cover: data-image-on
    document.querySelectorAll(`.media-tile .main-icon[data-image-on="${id}"]`).forEach(mainIcon => {
      mainIcon.style.backgroundImage = `url('${value}')`;
    });

    // Lautstärkeanzeige
    document.querySelectorAll(`.media-tile .volume-display[data-id="${id}"]`).forEach(volDisplay => {
      const volumeValue = value ?? 0;
      const unit = volDisplay.dataset.unit ?? '';
      volDisplay.textContent = `${volumeValue}${unit}`;
    });

    // Allowed Buttons
    document.querySelectorAll(`.media-tile .media-control-button[data-allowed-id="${id}"]:not(.readonly)`)
      .forEach(button => {
        const allowedValue = (value === true || value === 'true');
        button.disabled = !allowedValue;
      });

    // Toggle-Buttons (z. B. Play/Pause)
    document.querySelectorAll(`.media-tile .media-control-button[data-control-id="${id}"][data-is-toggle="true"]`)
      .forEach(button => {
        const currentValue = (value === true || value === 'true');
        button.classList.toggle('active', currentValue);
      });

    // Fortschrittsbalken (z. B. Song-Position)
    document.querySelectorAll(`.media-tile .media-progress-container[data-progress-id="${id}"],
                               .media-progress-container[data-length-id="${id}"]`)
      .forEach(progressContainer => {
        const progressId = progressContainer.dataset.progressId;
        const lengthId = progressContainer.dataset.lengthId;
        const stateId = progressContainer.dataset.id;

        const progressValue = ioBrokerStates[progressId]?.val || 0;
        const lengthValue = ioBrokerStates[lengthId]?.val || 0;
        const stateValue = ioBrokerStates[stateId]?.val || false;

        let progressPercent = 33; // Default
        if (lengthValue > 0) {
          progressPercent = (progressValue / lengthValue) * 100;
          progressPercent = Math.min(Math.max(progressPercent, 0), 100);
        }

        const progressFill = progressContainer.querySelector('.media-progress-fill');
        progressFill.style.width = `${progressPercent}%`;

        const progressTime = progressContainer.querySelector('.media-progress-time');
        progressTime.textContent = formatJS.formatSecondsTime(progressValue);

        const lengthTime = progressContainer.querySelector('.media-length-time');
        lengthTime.textContent = formatJS.formatSecondsTime(lengthValue);
        lengthTime.style.display = (lengthValue === 0) ? 'none' : '';

        progressContainer.style.display = stateValue ? '' : 'none';
      });

    // Artist/Title
    document.querySelectorAll(`.media-tile .media-info-container[data-title-id="${id}"]`)
      .forEach(infoContainer => {
        setTimeout(() => {
          const artistId = infoContainer.dataset.artistId;
          const titleId = infoContainer.dataset.titleId;
          const stateId = infoContainer.dataset.id;

          const stateValue = ioBrokerStates[stateId]?.val || false;
          const artist = artistId ? (ioBrokerStates[artistId]?.val || '') : '';
          const title = titleId ? (ioBrokerStates[titleId]?.val || '') : '';

          infoContainer.style.display = stateValue ? '' : 'none';
          infoContainer.textContent = `${artist} - ${title}`;
        }, 100);
      });
  },

  /**
   * Aktualisiert Thermometer (Temperatur) und Hygrometer (Feuchtigkeit),
   * indem die IDs abgeglichen werden. Ruft Methoden aus `deviceTemperatureJS` auf.
   *
   * @function
   * @memberof mainUpdaterJS
   * @param {string} id - State-ID für Temperatur oder Feuchtigkeit.
   * @returns {void}
   */
  updateThermometerAndHygrometer(id) {
    // Temperatur
    document.querySelectorAll('.thermometer-container[data-temperature-id="${id}"]').forEach(container => {
      deviceTemperatureJS.updateThermometer(id);
    });

    // Feuchtigkeit
    document.querySelectorAll('.hygrometer-container[data-humidity-id="${id}"]').forEach(container => {
      deviceTemperatureJS.updateHydrometer(id);
    });
  },

  /**
   * Aktualisiert das HTML-Element, indem es den aktuellen Wert aus `ioBrokerStates[id]` einliest
   * und erneut setzt. Kann z.B. aufgerufen werden, wenn `onUpdate` oder ein Intervall feuert.
   *
   * @function
   * @memberof deviceIframeJS
   * @param {string} id - State-ID des HTML-Inhalts.
   * @param {*} value - Neuer Wert
   * @returns {void}
   */
  updateHTMLContent(id, value) {
    document.querySelectorAll(`.html-content[data-html-id="${id}"]`).forEach(container => {
      container.innerHTML = value;
    });
  }

};
