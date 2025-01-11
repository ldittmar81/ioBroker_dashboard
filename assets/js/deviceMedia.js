/**
 * Das Modul deviceMediaJS stellt Funktionen bereit, um Mediengeräte (z.B. Radios, Player)
 * im Dashboard darzustellen und zu steuern. Es ermöglicht:
 *
 * - Anzeigen eines Haupticons (Cover/Bild)
 * - Fortschrittsbalken (Laufzeit / verbleibende Zeit)
 * - Titel- und Interpretenanzeige
 * - Bedienelemente wie Play, Pause, Stop etc.
 * - Lautstärkeregelung
 * - Kanalauswahl über ein Overlay
 *
 * @namespace deviceMediaJS
 */
const deviceMediaJS = {

  /**
   * @typedef {Object} MediaInfoDefinition
   * @property {string} function - Rolle des Infoelements (z. B. 'artist', 'title', 'imageURL', 'progress', 'length').
   * @property {string} id - State-ID, aus der der jeweilige Wert gelesen wird (z. B. "alias.0.radio.title").
   * @property {string} [unit] - (Optional) Einheit, z.B. "s" bei progress/länge.
   */

  /**
   * @typedef {Object} MediaControlDefinition
   * @property {string} function - Rolle des Controls (z.B. 'play', 'pause', 'stop', 'volume', 'volumeUp', 'volumeDown', ...).
   * @property {string} id - State-ID, an die ein entsprechender Befehl gesendet wird.
   * @property {boolean|string} [allowed] - (Optional) Gibt an, ob das Control aktuell aktiviert ist (true/false).
   * @property {string} [type] - (Optional) z.B. 'boolean' für ein Toggle-Control.
   * @property {string} [unit] - (Optional) Einheit, z. B. '%' für Lautstärke.
   * @property {number} [step] - (Optional) Schrittweite, z. B. 10 für Lautstärkeänderung in 10%-Schritten.
   * @property {boolean|string} [sendValue] - (Optional) Der Wert, der beim Klicken/Toggle gesendet wird (z.B. "true").
   */

  /**
   * @typedef {Object} MediaChannelDefinition
   * @property {string} label - Anzeigename des Kanals (z. B. "Channel 1").
   * @property {string} id - State-ID, an die ein Wechselbefehl gesendet werden soll.
   * @property {string} [image] - (Optional) Bilddateiname (z.B. "channel1.png").
   * @property {string} [id_suffix] - (Optional) Wird evtl. an eine Prefix-ID angehängt.
   * @property {string|boolean} [sendValue] - (Optional) Spezieller Wert, der an die State-ID gesendet werden soll.
   */

  /**
   * @typedef {Object} ChannelListDefinition
   * @property {string} list - JSON-Datei mit Kanälen (z. B. "radioChannels.json").
   * @property {string} [id_prefix] - (Optional) Prefix, das vor jede `channel.id` gesetzt wird.
   */

  /**
   * @typedef {Object} MediaDeviceDefinition
   * @property {string} name - Name des Geräts, wird meist als Überschrift angezeigt.
   * @property {string} value - State-ID, um das Gerät ein-/auszuschalten (boolean).
   * @property {string} image - Bilddateiname, das angezeigt wird, wenn kein Cover verfügbar ist (z. B. "radio.png").
   * @property {MediaInfoDefinition[]} mediainfo - Array von Info-Objekten (Artist, Title, Cover, usw.).
   * @property {MediaControlDefinition[]} controls - Array von Steuer-Objekten (Play, Pause, Volume, ...).
   * @property {MediaChannelDefinition[]} [channels] - (Optional) Statische Kanaldefinitionen.
   * @property {ChannelListDefinition[]} [channellists] - (Optional) Array von dynamischen Channellists (JSON-Dateien).
   */

  /**
   * Fügt Medien-Controls (Cover/Bild, Container für Buttons und Lautstärke)
   * in das übergebene `tileContent` ein.
   * - Läd das Haupticon (z.B. Cover), falls mediainfo dafür vorhanden ist.
   * - Legt einen Container `media-content` an, der das Icon und die Steuerungselemente enthält.
   * - Ruft `addMediaProgressAndInfo()` auf, um Fortschrittsbalken und Künstler/Titel anzuzeigen.
   *
   * @function
   * @memberof deviceMediaJS
   * @param {HTMLElement} tileContent - Der Container (z. B. eine Kachel), in den die Media-Steuerung eingefügt wird.
   * @param {MediaDeviceDefinition} device - Objekt mit Medien-Infos, Controls, Bild usw.
   * @param {boolean} canWrite - Gibt an, ob der Nutzer Schreibrechte hat (also Buttons aktiv).
   * @returns {void}
   */
  addMediaControls(tileContent, device, canWrite) {
    ioBrokerJS.addPageId(device.value, 'boolean');

    // Hauptcontainer
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('media-content');

    // Haupticon (Bild)
    const mainIcon = document.createElement('div');
    mainIcon.classList.add('main-icon');
    mainIcon.dataset.id = device.value;

    const isActive = ioBrokerStates[device.value]?.val || false;
    const mediainfoImageURL = device.mediainfo.find(mediainfo => mediainfo.function === 'imageURL');

    // "Aus"-Bild
    const imageOff = `url('assets/img/devices/media/${device.image}')`;
    // "An"-Bild (Cover/CoverURL), falls das Gerät aktiv ist
    const imageOn = `url('${isActive && mediainfoImageURL && mediainfoImageURL.id
      ? ioBrokerStates[mediainfoImageURL.id]?.val || imageOff
      : imageOff}')`;

    mainIcon.style.backgroundImage = isActive ? imageOn : imageOff;
    mainIcon.dataset.imageOff = device.image;
    mainIcon.dataset.imageOn = mediainfoImageURL && mediainfoImageURL.id ? mediainfoImageURL.id : '';

    // Demo-Mode: Falls ein DemoValue erzeugt werden soll
    demoJS.addDemoValue(mediainfoImageURL?.id, "imageURL");

    // Steuerungscontainer (Buttons, Lautstärke)
    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('media-controls-container');

    // Füge mainIcon und controlsContainer ins contentContainer
    contentContainer.appendChild(mainIcon);
    contentContainer.appendChild(controlsContainer);

    // contentContainer ins tileContent
    tileContent.appendChild(contentContainer);

    // Speichere controlsContainer für spätere Nutzung
    tileContent.controlsContainer = controlsContainer;

    // Fortschrittsbalken und Titel-/Interpretenanzeige
    deviceMediaJS.addMediaProgressAndInfo(tileContent, device, device.value);
  },

  /**
   * Fügt die sekundären Media-Controls (Buttons wie Play, Pause, Stop, Next usw.)
   * und (sofern vorhanden) Lautstärkesteuerung zum bereits angelegten `tileContent` hinzu.
   *
   * @function
   * @memberof deviceMediaJS
   * @param {HTMLElement} tileContent - Der Container, in den die Bedienelemente eingefügt werden (z. B. Kachel).
   * @param {MediaDeviceDefinition} device - Gerätedaten mit `controls`, die die Buttons beschreiben.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  addSecondaryMediaControls(tileContent, device, canWrite) {
    const controlsContainer = tileContent.controlsContainer;

    // Container für die Media-Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('media-buttons');

    // Mapping von control.function auf FontAwesome-Icons
    const functionIcons = {
      'play': 'fa-play',
      'pause': 'fa-pause',
      'stop': 'fa-stop',
      'forward': 'fa-forward',
      'rewind': 'fa-backward',
      'next': 'fa-step-forward',
      'previous': 'fa-step-backward',
      'repeat': 'fa-repeat',
      'shuffle': 'fa-shuffle'
    };

    // Erstelle Buttons
    device.controls.forEach(control => {
      // Lautstärke wird später separat behandelt
      if (['volume', 'volumeUp', 'volumeDown', 'volumeValue'].includes(control.function)) {
        return;
      }

      const button = document.createElement('button');
      button.classList.add('media-control-button', `${control.function}-button`);
      button.style.margin = '1px';

      if (!canWrite) {
        button.classList.add("readonly");
      }

      // Icon setzen
      const iconClass = functionIcons[control.function] || 'fa-question';
      button.innerHTML = `<i class="fas ${iconClass}"></i>`;

      // Data-Attribute
      button.dataset.controlId = control.id;

      // allowed (Steuerzustand?)
      let allowedToChange = true;
      if (control.allowed) {
        ioBrokerJS.addPageId(control.allowed, 'true');
        button.dataset.allowedId = control.allowed;
        allowedToChange = formatJS.isTrue(ioBrokerStates[control.allowed]?.val);
      }

      button.disabled = !canWrite || !allowedToChange;

      // Boolean: Toggle-Button
      if (control.type === 'boolean') {
        button.dataset.isToggle = 'true';
        ioBrokerJS.addPageId(control.id, 'boolean');
        if (canWrite && allowedToChange) {
          button.addEventListener('click', () => {
            const currentValue = ioBrokerStates[control.id]?.val ?? false;
            const newValue = !currentValue;
            ioBrokerJS.sendCommand(control.id, newValue);
          });
        }
        // Aktueller Status
        const currentValue = ioBrokerStates[control.id]?.val ?? false;
        button.classList.toggle('active', currentValue);
      } else {
        // Standardbefehl (z. B. Play/Next)
        button.addEventListener('click', () => {
          ioBrokerJS.sendCommand(control.id, true);
        });
      }

      buttonContainer.appendChild(button);
    });

    // Lautstärke
    const volumeControl = device.controls.find(control => control.function === 'volume');
    if (volumeControl) {
      deviceMediaJS.createVolumeControl(volumeControl, device, buttonContainer, canWrite);
    } else {
      // Sonderfall: separate controls für volumeUp/volumeDown/volumeValue
      deviceMediaJS.createVolumeSpecialControl(device, buttonContainer, canWrite);
    }

    // Buttons einfügen
    controlsContainer.appendChild(buttonContainer);
  },

  /**
   * Erzeugt eine Lautstärkesteuerung (Minus-/Plus-Button, Anzeige) für `volumeControl`.
   *
   * @function
   * @memberof deviceMediaJS
   * @param {MediaControlDefinition} volumeControl - Definition des Lautstärkecontrols (funktion = "volume").
   * @param {MediaDeviceDefinition} device - Gesamtes Geräteobjekt (falls weitere Infos nötig).
   * @param {HTMLElement} buttonContainer - Container, in den die Volume-Controls eingefügt werden.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  createVolumeControl(volumeControl, device, buttonContainer, canWrite) {
    ioBrokerJS.addPageId(volumeControl.id, '%');

    const volumeContainer = document.createElement('div');
    volumeContainer.classList.add('volume-controls');
    volumeContainer.style.display = 'flex';
    volumeContainer.style.alignItems = 'center';
    volumeContainer.style.margin = '1px';

    // Minus-Button
    const minusButton = document.createElement('button');
    minusButton.classList.add('media-control-button', 'volume-down-button');
    minusButton.innerHTML = '<i class="fas fa-volume-down"></i>';
    minusButton.style.marginRight = '1px';
    minusButton.disabled = !canWrite;
    volumeContainer.appendChild(minusButton);

    // Volume-Anzeige
    const volDisplay = document.createElement('span');
    volDisplay.classList.add('volume-display');
    volDisplay.dataset.unit = volumeControl.unit;
    const initialVolume = ioBrokerStates[volumeControl.id]?.val ?? 0;
    volDisplay.textContent = `${initialVolume}${volumeControl.unit}`;
    volumeContainer.appendChild(volDisplay);

    // Plus-Button
    const plusButton = document.createElement('button');
    plusButton.classList.add('media-control-button', 'volume-up-button');
    plusButton.innerHTML = '<i class="fas fa-volume-up"></i>';
    plusButton.style.marginLeft = '1px';
    plusButton.disabled = !canWrite;
    volumeContainer.appendChild(plusButton);

    const step = volumeControl.step ?? 10;

    if (canWrite) {
      minusButton.addEventListener('click', () => {
        deviceMediaJS.adjustVolume(device, volDisplay, -step);
      });
      plusButton.addEventListener('click', () => {
        deviceMediaJS.adjustVolume(device, volDisplay, step);
      });
    }

    buttonContainer.appendChild(volumeContainer);
  },

  /**
   * Falls kein "volume"-Control definiert ist, kann stattdessen ein
   * "volumeUp"/"volumeDown"/"volumeValue" Control vorhanden sein.
   * Diese Methode kümmert sich um diese Sonderfälle (Erzeugen von Buttons + Anzeige).
   *
   * @function
   * @memberof deviceMediaJS
   * @param {MediaDeviceDefinition} device - Das Geräteobjekt mit den Controls.
   * @param {HTMLElement} buttonContainer - Container, in den die Volume-Controls eingefügt werden.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {void}
   */
  createVolumeSpecialControl(device, buttonContainer, canWrite) {
    const volumeUpControl = device.controls.find(control => control.function === 'volumeUp');
    const volumeDownControl = device.controls.find(control => control.function === 'volumeDown');
    const volumeValueControl = device.controls.find(control => control.function === 'volumeValue');

    if (volumeUpControl || volumeDownControl || volumeValueControl) {
      const volumeContainer = document.createElement('div');
      volumeContainer.classList.add('volume-controls');
      volumeContainer.style.display = 'flex';
      volumeContainer.style.alignItems = 'center';
      volumeContainer.style.margin = '1px';

      // Volume-Down
      if (volumeDownControl) {
        const minusButton = document.createElement('button');
        minusButton.classList.add('media-control-button', 'volume-down-button');
        minusButton.innerHTML = '<i class="fas fa-volume-down"></i>';
        minusButton.style.marginRight = '1px';
        minusButton.disabled = !canWrite;
        volumeContainer.appendChild(minusButton);

        if (canWrite) {
          minusButton.addEventListener('click', () => {
            ioBrokerJS.sendCommand(volumeDownControl.id, true);
          });
        }
      }

      // Volume-Anzeige
      if (volumeValueControl) {
        ioBrokerJS.addPageId(volumeValueControl.id, '%');
        const volDisplay = document.createElement('span');
        volDisplay.classList.add('volume-display');
        volDisplay.dataset.id = volumeValueControl.id;
        volDisplay.dataset.unit = volumeValueControl.unit ?? '';

        const initialVolume = ioBrokerStates[volumeValueControl.id]?.val ?? 0;
        volDisplay.textContent = `${initialVolume}${volDisplay.dataset.unit}`;
        volumeContainer.appendChild(volDisplay);
      }

      // Volume-Up
      if (volumeUpControl) {
        const plusButton = document.createElement('button');
        plusButton.classList.add('media-control-button', 'volume-up-button');
        plusButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        plusButton.style.marginLeft = '1px';
        plusButton.disabled = !canWrite;
        volumeContainer.appendChild(plusButton);

        if (canWrite) {
          plusButton.addEventListener('click', () => {
            ioBrokerJS.sendCommand(volumeUpControl.id, true);
          });
        }
      }

      buttonContainer.appendChild(volumeContainer);
    }
  },

  /**
   * Passt die Lautstärke an, indem ein neuer Wert (0-100) berechnet und gesendet wird.
   *
   * @function
   * @memberof deviceMediaJS
   * @param {MediaDeviceDefinition} device - Das Geräteobjekt (enthält `controls`).
   * @param {HTMLSpanElement} volDisplay - Das Element, in dem der Lautstärkewert angezeigt wird.
   * @param {number} step - Änderung (+/-), z.B. +10 oder -10.
   * @returns {void}
   */
  adjustVolume(device, volDisplay, step) {
    const volumeControl = device.controls.find(control => control.function === 'volume');
    if (volumeControl) {
      const currentVolume = ioBrokerStates[volumeControl.id]?.val || 0;
      let newVolume = currentVolume + step;

      // Begrenze auf 0-100
      newVolume = Math.max(0, Math.min(100, newVolume));

      volDisplay.textContent = `${newVolume}${volumeControl.unit}`;
      ioBrokerJS.sendCommand(volumeControl.id, newVolume);
    }
  },

  /**
   * Fügt einen Fortschrittsbalken (Laufzeit / restliche Zeit) sowie
   * eine Infozeile (Titel/Artist) hinzu.
   * - Blendet diese Elemente aus, wenn das Gerät (`stateId`) nicht aktiv ist.
   *
   * @function
   * @memberof deviceMediaJS
   * @param {HTMLElement} tileContent - Die Kachel, in die die Elemente eingefügt werden.
   * @param {MediaDeviceDefinition} device - Enthält z. B. `mediainfo` (progress, length, artist, title).
   * @param {string} stateId - State-ID, die den Ein-/Aus-Status des Geräts bestimmt.
   * @returns {void}
   */
  addMediaProgressAndInfo(tileContent, device, stateId) {
    const isActive = ioBrokerStates[stateId]?.val || false;

    // Fortschrittsanzeige
    const progressContainer = document.createElement('div');
    progressContainer.classList.add('media-progress-container');

    const progressBar = document.createElement('div');
    progressBar.classList.add('media-progress-bar');

    const progressFill = document.createElement('div');
    progressFill.classList.add('media-progress-fill');
    progressBar.appendChild(progressFill);

    const progressTime = document.createElement('div');
    progressTime.classList.add('media-progress-time');
    progressTime.textContent = '00:00';

    const lengthTime = document.createElement('div');
    lengthTime.classList.add('media-length-time');
    lengthTime.textContent = '00:00';

    progressContainer.appendChild(progressTime);
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(lengthTime);

    // IDs für Updates
    const lengthInfo = device.mediainfo.find(info => info.function === 'length');
    const progressInfo = device.mediainfo.find(info => info.function === 'progress');
    progressContainer.dataset.id = stateId;

    if (lengthInfo) {
      ioBrokerJS.addPageId(lengthInfo.id, lengthInfo.unit);
      progressContainer.dataset.lengthId = lengthInfo.id;
      progressContainer.dataset.lengthUnit = lengthInfo.unit || '';
    }

    if (progressInfo) {
      ioBrokerJS.addPageId(progressInfo.id, progressInfo.unit);
      progressContainer.dataset.progressId = progressInfo.id;
      progressContainer.dataset.progressUnit = progressInfo.unit || '';
    }

    if (!isActive) {
      progressContainer.style.display = 'none';
    }
    tileContent.appendChild(progressContainer);

    // Infozeile (Artist - Title)
    const infoContainer = document.createElement('div');
    infoContainer.classList.add('media-info-container');

    const artistInfo = device.mediainfo.find(info => info.function === 'artist');
    const titleInfo = device.mediainfo.find(info => info.function === 'title');

    let artist = '';
    let title = '';

    infoContainer.dataset.id = stateId;

    if (artistInfo) {
      ioBrokerJS.addPageId(artistInfo.id, '');
      artist = ioBrokerStates[artistInfo.id]?.val || '';
      infoContainer.dataset.artistId = artistInfo.id;
    }

    if (titleInfo) {
      ioBrokerJS.addPageId(titleInfo.id, '');
      title = ioBrokerStates[titleInfo.id]?.val || '';
      infoContainer.dataset.titleId = titleInfo.id;
    }

    infoContainer.textContent = `${artist} - ${title}`;

    if (!isActive) {
      infoContainer.style.display = 'none';
    }

    tileContent.appendChild(infoContainer);
  },

  /**
   * Öffnet ein Overlay, um Kanäle (z. B. Radiosender) anzuzeigen.
   * - Listet sowohl statische Channels (`device.channels`) als auch
   *   ggf. dynamische Channellists (`device.channellists`) auf.
   * - Klick auf einen Kanal sendet den entsprechenden Befehl (channel.id).
   *
   * @async
   * @function
   * @memberof deviceMediaJS
   * @param {MediaDeviceDefinition} device - Gerätedaten mit `channels`/`channellists`.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {Promise<void>}
   */
  async openChannelsOverlay(device, canWrite) {
    const overlay = document.createElement('div');
    overlay.classList.add('channels-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('channels-overlay-content');

    const overlayTitle = document.createElement('h2');
    overlayTitle.textContent = `${device.name} - Kanäle`;
    overlayContent.appendChild(overlayTitle);

    // Container für die Kanäle
    const channelsContainer = document.createElement('div');
    channelsContainer.classList.add('channels-container');

    // Statische Kanäle
    if (device.channels && Array.isArray(device.channels)) {
      device.channels.forEach(channel => {
        const channelItem = deviceMediaJS.createChannelItem(channel, canWrite);
        channelsContainer.appendChild(channelItem);
      });
    }

    // Dynamische Kanallisten (z. B. JSON-Dateien)
    if (device.channellists && Array.isArray(device.channellists)) {
      for (const channellist of device.channellists) {
        await deviceMediaJS.fetchChannellist(channellist, device, channelsContainer, canWrite);
      }
    }

    overlayContent.appendChild(channelsContainer);

    // Schließen-Button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Schließen';
    closeButton.classList.add('close-button');
    closeButton.onclick = () => {
      document.body.removeChild(overlay);
    };
    overlayContent.appendChild(closeButton);

    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
  },

  /**
   * Erzeugt ein einzelnes DOM-Element für einen Kanal (Bild + Text).
   * - Klick auf das Element sendet `channel.sendValue` oder `channel.label` an `channel.id`.
   *
   * @function
   * @memberof deviceMediaJS
   * @param {MediaChannelDefinition} channel - Beschreibt einen einzelnen Kanal (label, id, image).
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {HTMLDivElement} Das erstellte DOM-Element für den Kanal.
   */
  createChannelItem(channel, canWrite) {
    const channelItem = document.createElement('div');
    channelItem.classList.add('channel-item');

    const img = document.createElement('img');
    if (channel.image) {
      img.src = `assets/img/devices/media/channels/${channel.image}`;
    } else {
      img.src = "assets/img/devices/media/channel.webp";
    }
    img.alt = channel.label;
    channelItem.appendChild(img);

    const label = document.createElement('div');
    label.classList.add('channel-item-label');
    label.textContent = channel.label;
    channelItem.appendChild(label);

    if (!canWrite) {
      channelItem.style.cursor = 'not-allowed';
    }

    if (canWrite) {
      channelItem.onclick = () => {
        const value = channel.sendValue || channel.label;
        ioBrokerJS.sendCommand(channel.id, value);

        // Overlay schließen
        const overlay = document.querySelector('.channels-overlay');
        if (overlay) {
          document.body.removeChild(overlay);
        }
      };
    }

    return channelItem;
  },

  /**
   * Lädt eine externe Kanalliste (JSON-Datei), parst sie und
   * hängt die Kanäle an `channelsContainer` an.
   * - Falls `id_prefix` gesetzt ist, wird dieser an jede Channel-ID angehängt.
   *
   * @async
   * @function
   * @memberof deviceMediaJS
   * @param {ChannelListDefinition} channellist - Enthält den Dateinamen `list` und optional ein `id_prefix`.
   * @param {MediaDeviceDefinition} device - Das Media-Device (für Zusatzinfos, falls nötig).
   * @param {HTMLElement} channelsContainer - Container, in den die neu erstellten Channel-Items appended werden.
   * @param {boolean} canWrite - Schreibrechte vorhanden?
   * @returns {Promise<void>} Promise, der erfüllt wird, wenn die Kanalliste erfolgreich geladen wurde.
   */
  async fetchChannellist(channellist, device, channelsContainer, canWrite) {
    try {
      const response = await fetch(`data/helpers/mediaChannelLists/${channellist.list}?v=${dashboardVersion}`);
      if (response.ok) {
        const channels = await response.json();
        channels.forEach(channel => {
          // Optional: id_prefix
          if (channellist.id_prefix) {
            channel.id = channellist.id_prefix + (channel.id_suffix || '');
          }
          const channelItem = deviceMediaJS.createChannelItem(channel, canWrite);
          channelsContainer.appendChild(channelItem);
        });
      } else {
        console.error(`Fehler beim Laden der Kanalliste ${channellist.list}`);
      }
    } catch (error) {
      console.error(`Fehler beim Laden der Kanalliste ${channellist.list}:`, error);
    }
  }
};
