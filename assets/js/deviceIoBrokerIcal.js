/**
 * deviceIoBrokerIcal.js
 *
 * Stellt ein „Core“-Objekt bereit, das Kalenderdaten (iCal) für Devices
 * UND andere Module (z.B. Sidebar) verarbeiten kann.
 *
 * @namespace deviceIoBrokerIcalJS
 */
const deviceIoBrokerIcalJS = {

  /**
   * Lädt Kalenderdaten aus den im Array `calendars` angegebenen State-IDs.
   * (Ehemals: sidebarCalendarJS.fetchIoBrokerCalendarData)
   * @param {Array<Object>} calendars - Array von Kalender-Objekten wie `{ cal: stateId, rgb: "#49b675", image: "birthday.png" }`.
   * @returns {Promise<Array<{cal: string, rgb: string, image: string, data: Array}>}>}
   */
  async fetchIoBrokerCalendarData(calendars) {
    const eventsResult = [];

    for (const calendar of calendars) {
      const stateId = calendar.cal;

      // Im Demo-Modus ggf. Demo-Wert zufügen,
      // z.B. demoJS.addDemoValue(stateId, 'iCal');
      // (Falls dein Code so etwas benötigt.)

      // State aus dem globalen iobrokerStates-Objekt holen:
      const state = ioBrokerStates[stateId];
      if (!state) {
        console.error(`State ${stateId} nicht gefunden.`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(state.val);
      } catch (err) {
        console.error(`Fehler beim Parsen der Daten von ${stateId}:`, err);
        continue;
      }

      eventsResult.push({
        cal: calendar.cal,
        rgb: calendar.rgb,
        image: calendar.image,
        data: data
      });
    }

    return eventsResult;
  },

  /**
   * Filtert und sortiert alle Events aus den geladenen Kalenderdaten für ein bestimmtes Datum.
   * (Ehemals: sidebarCalendarJS.processCalendarData)
   *
   * @param {Array<Object>} calendarsData - Ergebnis aus fetchIoBrokerCalendarData.
   * @param {Date} date - Gewünschtes Datum (z.B. „heute“).
   * @returns {Array<Object>} sortiertes Array von Events mit {start, end, allDay, summary, color?, image?, ...}.
   */
  processCalendarData(calendarsData, date) {
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const allDayEvents = [];
    const timedEvents = [];

    calendarsData.forEach(calendarObj => {
      const {rgb, data, image} = calendarObj;

      data.forEach(event => {
        const eventStart = new Date(event._date);
        const eventEnd = new Date(event._end);

        // nur Events, die an diesem Tag stattfinden
        if (eventEnd >= startOfDay && eventStart <= endOfDay) {
          const eventObj = {
            summary: event.event,
            start: eventStart,
            end: eventEnd,
            color: rgb,
            allDay: !!event._allDay,
            location: event.location || '',
            class: event._class || '',
            calName: event._calName || '',
            image: image || null
          };

          if (event._allDay) {
            allDayEvents.push(eventObj);
          } else {
            timedEvents.push(eventObj);
          }
        }
      });
    });

    // ganztägige zuerst, danach zeitlich gebundene nach Startzeit
    const sortedTimed = timedEvents.sort((a, b) => a.start - b.start);
    return [...allDayEvents, ...sortedTimed];
  },

  /**
   * Rendert Events in ein Container-Element:
   * - Ähnlich wie deine createCalendarDisplay oder createDeviceCalendarDisplay.
   * - Unterscheidet `allDay` vs. zeitgebunden.
   * - Weist CSS-Klassen zu: event-past, event-now, event-future.
   *
   * @param {HTMLElement} container - z.B. ein <div>, in das gerendert wird.
   * @param {Array<Object>} events - resultierende Events (start, end, summary, image?, color?, allDay?).
   * @param {Object} [options] - Config, z. B. { heading: "Heutige Termine", showNavigation: false } etc.
   */
  renderCalendarEvents(container, events, options = {}) {
    const {
      heading = null
    } = options;

    // Optional: Überschrift
    if (heading) {
      const dateHeader = document.createElement('div');
      dateHeader.classList.add('calendar-date-header');
      dateHeader.textContent = heading;
      container.appendChild(dateHeader);
    }

    if (events.length === 0) {
      const noEvents = document.createElement('div');
      noEvents.classList.add('no-events');
      noEvents.textContent = "Keine Termine.";
      container.appendChild(noEvents);
      return;
    }

    // Wir gehen alle Events durch und erstellen <div> .calendar-event
    const now = new Date();
    events.forEach(event => {
      const eventElement = document.createElement('div');
      eventElement.classList.add('calendar-event');

      // Icon
      const eventIcon = document.createElement('div');
      eventIcon.classList.add('event-icon');
      if (event.image) {
        const img = document.createElement('img');
        img.src = "assets/img/devices/ioBroker_ical/" + event.image;
        img.alt = "Kalenderbild";
        eventIcon.appendChild(img);
      } else if (event.color) {
        eventIcon.style.backgroundColor = event.color;
      }
      eventElement.appendChild(eventIcon);

      // Info: Zeit + summary
      const eventInfo = document.createElement('div');
      eventInfo.classList.add('event-info');

      let timeText;
      if (event.allDay) {
        timeText = 'Ganztägig';
        eventElement.classList.add('event-now'); // bei allDay oft „jetzt“
      } else {
        const startTime = event.start.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
        const endTime = event.end.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
        timeText = `${startTime}-${endTime}`;

        // Status: past / now / future
        if (event.end < now) {
          eventElement.classList.add('event-past');
        } else if (event.start <= now && event.end >= now) {
          eventElement.classList.add('event-now');
        } else {
          eventElement.classList.add('event-future');
        }
      }

      eventInfo.textContent = `${timeText} ${event.summary}`;
      eventElement.appendChild(eventInfo);

      container.appendChild(eventElement);
    });
  },

  /**
   * Beispiel-Funktion: Wird von einem Device (Tile) genutzt, um
   * in `tileContent` eine (heutige) Termin-Liste anzuzeigen.
   *
   * @param {HTMLElement} tileContent - Container der Kachel
   * @param {Object} device - z.B. { name?: string, calendars: [...], ... }
   */
  async addIoBrokerIcalControls(tileContent, device) {
    const container = document.createElement('div');
    container.classList.add('ical-container');

    // Überschrift (Gerätename) optional
    if (device.name) {
      const title = document.createElement('h3');
      title.textContent = device.name;
      container.appendChild(title);
    }

    try {
      // 1. Kalenderdaten laden
      const calendarsData = await this.fetchIoBrokerCalendarData(device.calendars || []);

      // 2. Nur heutige Events filtern
      const events = this.processCalendarData(calendarsData, new Date());

      // 3. Calendar-Events in den Container rendern
      this.renderCalendarEvents(container, events, {heading: null});

      tileContent.prepend(container);
    } catch (error) {
      console.error('Fehler beim Laden der Kalenderdaten (Device):', error);
    }
  }
};
