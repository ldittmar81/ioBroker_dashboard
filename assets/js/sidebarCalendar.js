/**
 * sidebarCalendar.js
 *
 * Liest dieselben iCal-Daten wie deviceIoBrokerIcalJS,
 * zeigt sie aber in der Sidebar mit Navigation Heute <-> Morgen an.
 *
 * @namespace sidebarCalendarJS
 */
const sidebarCalendarJS = {

  // Datum, das aktuell in der Sidebar angezeigt wird
  currentDate: new Date(),

  /**
   * Aktualisiert die Sidebar-Anzeige:
   * 1. Kalenderdaten vom Core laden
   * 2. Events filtern
   * 3. Container leeren & neu rendern
   * 4. Navigation (Heute / Morgen) einbauen
   */
  updateCalendar() {
    const calendars = sidebarConfig?.ioBroker_ical?.calendars || [];
    deviceIoBrokerIcalJS.fetchIoBrokerCalendarData(calendars)
      .then(calendarsData => {
        const events = deviceIoBrokerIcalJS.processCalendarData(calendarsData, this.currentDate);

        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent) return;

        // Altes <div> .calendar-container entfernen
        const oldCalendar = sidebarContent.querySelector('.calendar-container');
        if (oldCalendar) {
          sidebarContent.removeChild(oldCalendar);
        }

        // Neues Container <div> anlegen
        const calendarContainer = document.createElement('div');
        calendarContainer.classList.add('calendar-container');

        // Überschrift (Heute/Morgen)
        const dateHeader = document.createElement('div');
        dateHeader.classList.add('calendar-date-header');
        dateHeader.textContent = this.isToday(this.currentDate)
          ? "Heutige Termine"
          : "Morgige Termine";
        calendarContainer.appendChild(dateHeader);

        // Navigation
        if (this.isToday(this.currentDate)) {
          // Button -> Morgen
          const navNext = document.createElement('div');
          navNext.classList.add('calendar-nav', 'calendar-nav-next');
          navNext.innerHTML = '&#9654;';
          navNext.addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.updateCalendar();
          });
          calendarContainer.appendChild(navNext);
        } else if (this.isTomorrow(this.currentDate)) {
          // Button -> Heute
          const navPrev = document.createElement('div');
          navPrev.classList.add('calendar-nav', 'calendar-nav-prev');
          navPrev.innerHTML = '&#9664;';
          navPrev.addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.updateCalendar();
          });
          calendarContainer.appendChild(navPrev);
        }

        // Events in diesen Container rendern (wieder via deviceIoBrokerIcalJS-Funktion)
        deviceIoBrokerIcalJS.renderCalendarEvents(calendarContainer, events, {heading: null});

        // Slide-in-Effekt
        calendarContainer.classList.add('calendar-slide-in');

        // An sidebar anhängen
        sidebarContent.appendChild(calendarContainer);

        // optional: Status der Events direkt updaten
        this.updateEventStatus();
      })
      .catch(error => {
        console.error('Fehler beim Laden/Filtern der Kalenderdaten (Sidebar):', error);
      });
  },

  /**
   * Prüft, ob das Datum `date` heute ist.
   */
  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  },

  /**
   * Prüft, ob das Datum `date` morgen ist.
   */
  isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();
  },

  /**
   * Startet periodische Aktualisierungen: alle 3h neu laden,
   * alle 1min updateEventStatus etc.
   */
  startCalendarUpdates() {
    this.updateCalendar();
    setInterval(() => this.updateCalendar(), 180 * 60 * 1000); // alle 3h
    setInterval(() => this.updateEventStatus(), 60 * 1000);    // 1x pro Minute
  },

  /**
   * Aktualisiert CSS-Klassen "event-past", "event-now", "event-future"
   * nachträglich (z.B. wenn die Zeit fortschreitet).
   */
  updateEventStatus() {
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;

    const eventElements = calendarContainer.querySelectorAll('.calendar-event');
    const now = new Date();

    eventElements.forEach(eventElement => {
      const startStr = eventElement.dataset.eventStart;
      const endStr = eventElement.dataset.eventEnd;
      if (!startStr || !endStr) return;

      const eventStart = new Date(startStr);
      const eventEnd = new Date(endStr);

      // reset
      eventElement.classList.remove('event-past', 'event-now', 'event-future');

      if (eventEnd < now) {
        eventElement.classList.add('event-past');
      } else if (eventStart <= now && eventEnd >= now) {
        eventElement.classList.add('event-now');
      } else {
        eventElement.classList.add('event-future');
      }
    });
  }
};

// Wenn die Sidebar aktiv ist, z.B.:
/// sidebarCalendarJS.startCalendarUpdates();
