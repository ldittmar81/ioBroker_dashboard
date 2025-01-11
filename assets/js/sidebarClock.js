/**
 * Das Modul sidebarClockJS stellt Funktionen bereit, um in der Sidebar
 * eine digitale (default) oder eine analoge Uhr anzuzeigen und fortlaufend
 * zu aktualisieren.
 *
 * @namespace sidebarClockJS
 */
const sidebarClockJS = {

  /**
   * Aktualisiert die Datums- und Zeitangaben in den Elementen
   * mit ID `time` und `day` (für die digitale Uhr).
   *
   * - `time` zeigt die aktuelle Uhrzeit (HH:MM:SS).
   * - `day` zeigt den Wochentag und das Datum an (z.B. "Montag, 01. Januar").
   *
   * @function
   * @memberof sidebarClockJS
   * @returns {void}
   */
  updateDateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    const day = now.toLocaleDateString('de-DE', {weekday: 'long'});
    const date = now.toLocaleDateString('de-DE', {day: '2-digit', month: 'long'});

    const timeElement = document.getElementById('time');
    const dayElement = document.getElementById('day');

    if (timeElement) {
      timeElement.textContent = time;
    }
    if (dayElement) {
      dayElement.textContent = day.charAt(0).toUpperCase() + day.slice(1) + ", " + date;
    }
  },

  /**
   * Startet die regelmäßige Aktualisierung der digitalen Uhr (einmal pro Sekunde).
   * Ruft `updateDateTime()` initial und dann in einem setInterval auf.
   *
   * @function
   * @memberof sidebarClockJS
   * @returns {void}
   */
  startDateTimeUpdates() {
    sidebarClockJS.updateDateTime(); // Initiale Anzeige
    setInterval(sidebarClockJS.updateDateTime, 1000); // Jede Sekunde aktualisieren
  },

  /**
   * Erzeugt die Standard-Digitaluhr in einem Eltern-Element, indem
   * zwei <div>-Elemente (`#time` und `#day`) angelegt werden.
   * Die Inhalte werden später durch `startDateTimeUpdates()` befüllt.
   *
   * @function
   * @memberof sidebarClockJS
   * @param {HTMLElement} parentElement - Das DOM-Element, in dem die digitale Uhr erscheinen soll.
   * @returns {void}
   */
  createDefaultClock(parentElement) {
    const timeElement = document.createElement('div');
    timeElement.id = 'time';
    timeElement.classList.add('datetime-large');

    const dayElement = document.createElement('div');
    dayElement.id = 'day';
    dayElement.classList.add('datetime-medium');

    parentElement.appendChild(timeElement);
    parentElement.appendChild(dayElement);
  },

  /**
   * Erzeugt eine analoge Uhr in einem Container-Element.
   * - Erstellt ein Zifferblatt mit Markierungen, Zahlen für 12/3/6/9 und drei Zeigern (Stunde, Minute, Sekunde).
   * - Fügt zusätzlich ein <div> für Datum/Tag an (ID `analog-day`).
   *
   * @function
   * @memberof sidebarClockJS
   * @param {HTMLElement} parentElement - Das DOM-Element (z.B. `.sidebar-content`), in das die Analoguhr eingefügt wird.
   * @returns {void}
   */
  createAnalogClock(parentElement) {
    const clockContainer = document.createElement('div');
    clockContainer.classList.add('analog-clock');

    // Zifferblatt
    const clockFace = document.createElement('div');
    clockFace.classList.add('clock-face');

    // Stundenmarkierungen
    for (let i = 1; i <= 12; i++) {
      const hourMark = document.createElement('div');
      hourMark.classList.add('hour-mark', `mark${i}`);
      if ([12, 3, 6, 9].includes(i)) {
        hourMark.classList.add('main-mark');
      }
      clockFace.appendChild(hourMark);
    }

    // Zahlen (12, 3, 6, 9)
    const numbers = {
      12: {class: 'number12', text: '12'},
      3: {class: 'number3', text: '3'},
      6: {class: 'number6', text: '6'},
      9: {class: 'number9', text: '9'}
    };
    for (const [key, value] of Object.entries(numbers)) {
      const numberElement = document.createElement('div');
      numberElement.classList.add('number', value.class);
      numberElement.textContent = value.text;
      clockFace.appendChild(numberElement);
    }

    clockContainer.appendChild(clockFace);

    // Zeiger
    const hourHand = document.createElement('div');
    hourHand.classList.add('hand', 'hour-hand');

    const minuteHand = document.createElement('div');
    minuteHand.classList.add('hand', 'minute-hand');

    const secondHand = document.createElement('div');
    secondHand.classList.add('hand', 'second-hand');

    clockContainer.appendChild(hourHand);
    clockContainer.appendChild(minuteHand);
    clockContainer.appendChild(secondHand);

    // Datum
    const dayElement = document.createElement('div');
    dayElement.id = 'analog-day';
    dayElement.classList.add('datetime-medium');

    parentElement.appendChild(clockContainer);
    parentElement.appendChild(dayElement);
  },

  /**
   * Startet die Aktualisierung der analogen Uhr, indem `updateAnalogClock()` initial
   * und dann jede Sekunde aufgerufen wird.
   *
   * @function
   * @memberof sidebarClockJS
   * @returns {void}
   */
  startAnalogClock() {
    sidebarClockJS.updateAnalogClock(); // Erste Aktualisierung
    setInterval(sidebarClockJS.updateAnalogClock, 1000); // Jede Sekunde
  },

  /**
   * Aktualisiert die Zeiger einer Analoguhr (Stunden-, Minuten-, Sekundenzeiger)
   * und das Datum (`#analog-day`).
   * - Berechnet die Gradzahl anhand der aktuellen Zeit.
   * - Setzt style.transform = `rotate(xDeg)`.
   *
   * @function
   * @memberof sidebarClockJS
   * @returns {void}
   */
  updateAnalogClock() {
    const now = new Date();

    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const secondHand = document.querySelector('.second-hand');
    const minuteHand = document.querySelector('.minute-hand');
    const hourHand = document.querySelector('.hour-hand');

    // Berechnung: 0 Sek => -90° (12 Uhr Position)
    const secondDegrees = ((seconds / 60) * 360) - 90;
    const minuteDegrees = (((minutes / 60) * 360) + ((seconds / 60) * 6)) - 90;
    const hourDegrees = ((hours % 12) / 12) * 360 + ((minutes / 60) * 30) - 90;

    if (secondHand) {
      secondHand.style.transform = `rotate(${secondDegrees}deg)`;
    }
    if (minuteHand) {
      minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
    }
    if (hourHand) {
      hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    }

    // Datum aktualisieren
    const dayElement = document.getElementById('analog-day');
    if (dayElement) {
      const day = now.toLocaleDateString('de-DE', {weekday: 'long'});
      const date = now.toLocaleDateString('de-DE', {day: '2-digit', month: 'long'});
      dayElement.textContent = day.charAt(0).toUpperCase() + day.slice(1) + ", " + date;
    }
  }
};
