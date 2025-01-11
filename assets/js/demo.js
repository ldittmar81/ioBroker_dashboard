/**
 * Das Modul demoJS stellt eine Demo-Verbindung zur Verfügung, wenn das Dashboard im Demo-Modus ist.
 * Anstatt echte Datenpunkte aus ioBroker zu verwenden, werden Zufallswerte generiert.
 * So kann das Dashboard auch ohne eine echte ioBroker-Installation getestet werden.
 *
 * @namespace demoJS
 */
const demoJS = {

  /**
   * Initialisiert den Demo-Modus, indem:
   * - `isDemoVersion = true` gesetzt wird.
   * - Die Seite direkt über `ioBrokerJS.initializePage()` geladen wird.
   *
   * @function
   * @memberof demoJS
   * @returns {void}
   */
  initializeDemoConnection() {
    console.log("DEMO Version!!!");
    isDemoVersion = true;
    // Wenn Demo aktiviert ist, wird direkt die Seite initialisiert, ohne Verbindung zu ioBroker
    ioBrokerJS.initializePage();
  },

  /**
   * Erzeugt eine kleine Demo-UI, die es ermöglicht:
   * - Aus allen registrierten `pageIds` eine auszuwählen.
   * - Den aktuellen Wert anzuzeigen.
   * - Einen neuen Wert in ein Eingabefeld einzugeben und per "Senden" zu übermitteln.
   *
   * @function
   * @memberof demoJS
   * @param {HTMLElement} container - Das Haupt-Container-Element, in das die Demo-UI eingefügt wird.
   * @returns {void}
   */
  addDemoUI(container) {
    // Erstelle ein Demo-Container
    const demoContainer = document.createElement('div');
    demoContainer.classList.add('demo-container');

    // Erstelle das Demo-Label
    const demoLabel = document.createElement('h3');
    demoLabel.textContent = 'Demo';
    demoContainer.appendChild(demoLabel);

    // Erstelle die Select-Box
    const selectLabel = document.createElement('label');
    selectLabel.setAttribute('for', 'demo-select');
    selectLabel.textContent = 'ID auswählen: ';
    demoContainer.appendChild(selectLabel);

    const selectBox = document.createElement('select');
    selectBox.id = 'demo-select';

    // Sortiere die pageIds alphabetisch
    const sortedPageIds = [...pageIds].sort();

    // Füge die Optionen zur Select-Box hinzu
    sortedPageIds.forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      selectBox.appendChild(option);
    });

    demoContainer.appendChild(selectBox);

    const currentValueLabel = document.createElement('label');
    currentValueLabel.setAttribute('for', 'current-value');
    currentValueLabel.textContent = 'Aktueller Wert: ';
    demoContainer.appendChild(currentValueLabel);

    const currentValueSpan = document.createElement('span');
    currentValueSpan.id = 'current-value';
    currentValueSpan.textContent = '';
    currentValueSpan.style.fontWeight = 'bold';
    demoContainer.appendChild(currentValueSpan);

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.id = 'demo-input';
    inputField.placeholder = 'Neuer Wert';
    inputField.style.marginLeft = '5px';
    demoContainer.appendChild(inputField);

    // Erstelle den "Senden" Button
    const sendButton = document.createElement('button');
    sendButton.textContent = 'Senden';
    sendButton.classList.add('btn', 'btn-success');
    sendButton.style.marginLeft = '10px';

    function updateCurrentValueDisplay() {
      const selectedId = selectBox.value;
      currentValueSpan.textContent = ioBrokerStates[selectedId]?.val ?? 'Nicht verfügbar';
    }

    updateCurrentValueDisplay();

    selectBox.addEventListener('change', updateCurrentValueDisplay);

    // Event-Listener für den "Senden" Button
    sendButton.addEventListener('click', () => {
      const selectedId = selectBox.value;
      const inputValue = inputField.value.trim();

      if (!selectedId) {
        alert('Bitte wähle eine ID aus.');
        return;
      }

      if (inputValue === '') {
        alert('Bitte gib einen Wert ein.');
        return;
      }

      // Führe den sendCommand aus
      ioBrokerJS.sendCommand(selectedId, inputValue);
      currentValueSpan.textContent = inputValue;

      // Optional: Leere das Input-Feld nach dem Senden
      inputField.value = '';
    });

    demoContainer.appendChild(sendButton);

    // Füge den Demo-Container zum Hauptinhalt hinzu
    container.prepend(demoContainer);
  },

  /**
   * Fügt (falls nicht bereits vorhanden) einen Demo-State für die angegebene `id` hinzu.
   *
   * @function
   * @memberof demoJS
   * @param {string} id - Die Datenpunkt-ID, für die ein Demo-Wert hinzugefügt werden soll.
   * @param {string} [valueType] - Ein Hinweis auf den Wertetyp (z.B. '%' für Prozentwerte).
   * @param {object} [object] - Zusätzliche Infos (z.B. {values: [...]}) für Listen.
   * @returns {void}
   */
  addDemoValue(id, valueType, object) {
    if (isDemoVersion && !(id in ioBrokerStates)) {
      ioBrokerStates[id] = demoJS.createDemoState(valueType, null, object);
    }
  },

  /**
   * Erzeugt einen Demo-State für den übergebenen Wert, ohne Wertetyp-Angabe.
   *
   * @function
   * @memberof demoJS
   * @param {*} value - Der Wert, für den ein State erstellt werden soll.
   * @returns {object} Ein State-Objekt im Format {val: ..., ts: ...}.
   */
  getDemoState(value) {
    return demoJS.createDemoState(null, value);
  },

  /**
   * Erzeugt ein Demo-State-Objekt (z.B. {val: 42, ts: 1234567890}) mit zufällig generierten
   * oder vordefinierten Werten, abhängig von `valueType`.
   *
   * @function
   * @memberof demoJS
   * @param {string} [valueType] - Wertetyp, z.B. '%' für Prozent, 'K' für Kelvin, 'list' für Listenwerte etc.
   * @param {*} [value] - Falls gesetzt, wird dieser Wert direkt verwendet (keine Zufallsgenerierung).
   * @param {object} [object] - Weitere Infos z.B. {values: [...]} bei Listenwerten.
   * @returns {object} State-Objekt mit den Feldern:
   *  - `val`: Der generierte oder übergebene Wert.
   *  - `ts`: Zeitstempel (in ms seit 1970).
   */
  createDemoState(valueType, value, object) {
    const demoState = {};

    // Wenn ein fixer Wert übergeben wurde, verwende diesen
    if (value !== null && value !== undefined) {
      demoState.val = value;
    } else {
      // Sonst generiere je nach valueType einen Zufallswert
      switch (valueType) {
        case '%':
          demoState.val = demoJS.getRandomPercentage();
          break;
        case 'K':
          demoState.val = demoJS.getRandomKelvin();
          break;
        case 'color':
        case 'rgb':
          demoState.val = demoJS.getRandomRGB();
          break;
        case 'colorList':
          demoState.val = demoJS.getRandomRGB() + "," + demoJS.getRandomRGB() + "," + demoJS.getRandomRGB();
          break;
        case 'hue':
          demoState.val = demoJS.getRandomHUE();
          break;
        case 'boolean':
          demoState.val = demoJS.getRandomBoolean();
          break;
        case 'unreach':
          demoState.val = demoJS.getRandomBoolean();
          break;
        case 'rssi':
          demoState.val = demoJS.getRandomRSSI();
          break;
        case '0,1,2':
          demoState.val = demoJS.getRandomEnum();
          break;
        case 'hidden':
          demoState.val = false;
          break;
        case '°C':
          demoState.val = demoJS.getRandomCelsius();
          break;
        case 'min':
          demoState.val = demoJS.getRandomMinutes();
          break;
        case 'iCal':
          demoState.val = demoJS.getRandomCalendar();
          break;
        case 'imageURL':
          demoState.val = demoJS.getRandomImageURL();
          break;
        case 'true':
        case 'button':
          demoState.val = true;
          break;
        case 'false':
          demoState.val = false;
          break;
        case 'list':
          // Nimm den ersten Eintrag aus den Values
          demoState.val = Array.isArray(object?.values) ? object.values[0].split(':')[0] : '';
          break;
        case 'text':
        case undefined:
          demoState.val = demoJS.getRandomShortText(6);
          break;
        case 'number':
        default:
          demoState.val = demoJS.getRandomNumberInRange(0, 1000);
      }
    }

    demoState.ts = Date.now(); // Zeitstempel hinzufügen
    return demoState;
  },

  /**
   * Gibt eine Zufallszahl zwischen 0 und 100 (inklusive) zurück.
   *
   * @function
   * @memberof demoJS
   * @returns {number} Zufälliger Prozentsatz (0-100).
   */
  getRandomPercentage() {
    return Math.floor(Math.random() * 101); // 0 bis 100 %
  },

  /**
   * Gibt einen zufälligen Wert in Kelvin zurück (2000K bis 6500K).
   *
   * @function
   * @memberof demoJS
   * @returns {number} Zufällige Farbtemperatur (2000-6500).
   */
  getRandomKelvin() {
    return Math.floor(Math.random() * (6500 - 2000 + 1)) + 2000; // 2000K bis 6500K
  },

  /**
   * Erzeugt einen zufälligen Hex-Farbwert, z.B. "#3F5ABD".
   *
   * @function
   * @memberof demoJS
   * @returns {string} Zufällige Hex-Farbe (#rrggbb).
   */
  getRandomRGB() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  },

  /**
   * Gibt einen zufälligen Farbwinkel (Hue) zwischen 0 und 240 zurück (0°-240°).
   *
   * @function
   * @memberof demoJS
   * @returns {number} Zufälliger Farbwinkel (0-240).
   */
  getRandomHUE() {
    return Math.floor(Math.random() * 241); // 0 bis 240
  },

  /**
   * Gibt mit 10% Wahrscheinlichkeit `true` zurück, sonst `false`.
   *
   * @function
   * @memberof demoJS
   * @returns {boolean} Zufälliger boolescher Wert.
   */
  getRandomBoolean() {
    return Math.random() > 0.9; // Ca. 10% true
  },

  /**
   * Gibt einen zufälligen RSSI-Wert zwischen -100 und 0 zurück.
   *
   * @function
   * @memberof demoJS
   * @returns {number} Zufälliger RSSI-Wert (-100 bis 0).
   */
  getRandomRSSI() {
    return Math.floor(Math.random() * 101) - 100; // -100 bis 0
  },

  /**
   * Gibt eine zufällige Zahl 0, 1 oder 2 zurück.
   *
   * @function
   * @memberof demoJS
   * @returns {number} 0, 1 oder 2.
   */
  getRandomEnum() {
    return Math.floor(Math.random() * 3);
  },

  /**
   * Erzeugt eine Zufallszahl zwischen -30 und +50 °C mit 2 Nachkommastellen.
   *
   * @function
   * @memberof demoJS
   * @returns {number} Temperaturwert z.B. 23.57.
   */
  getRandomCelsius() {
    return parseFloat((Math.random() * 80 - 30).toFixed(2)); // -30.00 bis 50.00 °C
  },

  /**
   * Gibt eine zufällige Minutenanzahl zwischen 0 und 1200 zurück.
   *
   * @function
   * @memberof demoJS
   * @returns {number} Minuten (0-1200).
   */
  getRandomMinutes() {
    return Math.floor(Math.random() * 1201); // 0 bis 1200 min
  },

  /**
   * Erzeugt eine Zufallszeichenkette der angegebenen Länge aus Buchstaben, Ziffern und Sonderzeichen.
   *
   * @function
   * @memberof demoJS
   * @param {number} length - Gewünschte Länge der Zeichenkette.
   * @returns {string} Zufällige Zeichenkette, z.B. "Ab12#X".
   */
  getRandomShortText(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  /**
   * Gibt eine Zufallszahl zwischen min und max (inklusive) zurück.
   *
   * @function
   * @memberof demoJS
   * @param {number} min - Untere Grenze.
   * @param {number} max - Obere Grenze.
   * @returns {number} Zufällige Ganzzahl zwischen min und max.
   */
  getRandomNumberInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Gibt eine zufällige Bild-URL (picsum.photos) zurück (200x200 px).
   *
   * @function
   * @memberof demoJS
   * @returns {string} z.B. "https://picsum.photos/200".
   */
  getRandomImageURL() {
    return "https://picsum.photos/200"; // Zufälliges Bild von picsum.photos
  },

  /**
   * Erzeugt oder gibt ein JSON-Array mit Beispieldaten für Kalendertermine zurück.
   * - Beim ersten Aufruf wird ein fester Satz an Beispieldaten zurückgegeben.
   * - Bei weiteren Aufrufen werden zufällige Events generiert (Vergangene oder zukünftige).
   *
   * @function
   * @memberof demoJS
   * @returns {string} Ein JSON-Array als String.
   */
  getRandomCalendar() {
    // Beim ersten Aufruf ein festes Beispiel danach zufällig generierte Events
    if (firstCalTest) {
      firstCalTest = false;
      return JSON.stringify([
        {
          "date": "Vorbei 12:00-14:00",
          "event": "Vorbei",
          "_date": new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          "_end": new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          "_allDay": false,
          "location": "Demo Ort",
          "_calName": "Demo Kalender",
          "_class": "ical_demo",
          "_calColor": "#FF0000"
        },
        {
          "date": "Vorbei 12:00-14:00",
          "event": "Gleich vorbei",
          "_date": new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          "_end": new Date(Date.now() + 30 * 1000).toISOString(),
          "_allDay": false,
          "location": "Demo Ort",
          "_calName": "Demo Kalender",
          "_class": "ical_demo",
          "_calColor": "#FF0000"
        },
        {
          "date": "Heute 12:00-14:00",
          "event": "Gleich gehts los",
          "_date": new Date(Date.now() + 60 * 1000).toISOString(),
          "_end": new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          "_allDay": false,
          "location": "Demo Ort",
          "_calName": "Demo Kalender",
          "_class": "ical_demo",
          "_calColor": "#FF0000"
        },
        {
          "date": "Heute 15:00-16:00",
          "event": "Später",
          "_date": new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          "_end": new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          "_allDay": false,
          "location": "Demo Location",
          "_calName": "Demo Kalender",
          "_class": "ical_demo",
          "_calColor": "#00FF00"
        }
      ]);
    } else {
      // Zufällige Events generieren
      const titles = ["Team Meeting", "Projekt-Update", "Kaffeepause", "Spaziergang", "Telefonkonferenz"];
      const locations = ["Konferenzraum A", "Online", "Kantine", "Büro", "Park"];
      const calendarNames = ["Arbeit", "Privat", "Sport", "Familie"];
      const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFA500", "#FF00FF"];

      function getRandomTimeSpan(offsetHoursStart, offsetHoursEnd) {
        const start = new Date(
          Date.now() + offsetHoursStart * 60 * 60 * 1000 + Math.random() * 60 * 60 * 1000
        );
        const end = new Date(start.getTime() + (1 + Math.random()) * 60 * 60 * 1000);
        return {start: start.toISOString(), end: end.toISOString()};
      }

      const eventCount = Math.floor(Math.random() * 5) + 2; // 2 bis 6 Events
      const events = [];

      for (let i = 0; i < eventCount; i++) {
        const isPast = Math.random() > 0.5;
        const timeSpan = isPast
          ? getRandomTimeSpan(-3, -1)
          : getRandomTimeSpan(0, 5);

        events.push({
          date: isPast ? "Vorbei" : "Heute",
          event: titles[Math.floor(Math.random() * titles.length)],
          _date: timeSpan.start,
          _end: timeSpan.end,
          _allDay: Math.random() < 0.2, // 20% Ganztags
          location: locations[Math.floor(Math.random() * locations.length)],
          _calName: calendarNames[Math.floor(Math.random() * calendarNames.length)],
          _class: "ical_demo",
          _calColor: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      return JSON.stringify(events);
    }
  }
};
