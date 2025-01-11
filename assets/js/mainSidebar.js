/**
 * Das Modul mainSidebarJS enthält Funktionen zur Verwaltung und Initialisierung
 * der linken Seitenleiste (Sidebar). Darunter fallen das Laden einer Konfigurationsdatei,
 * das Einbinden einer Uhr (digital oder analog) und ggf. eine Wetter- oder Kalender-Anzeige.
 *
 * @namespace mainSidebarJS
 */
const mainSidebarJS = {

  /**
   * Lädt die Sidebar-Konfiguration aus der Datei `sidebar.json`.
   * - Enthält z.B. Einstellungen für die Uhr (clock) oder das Wetter (openWeatherMap).
   * - Nutzt einen `fetch`-Aufruf und gibt ein Promise zurück, das entweder mit
   *   dem JSON-Inhalt aufgelöst wird oder bei Fehlern einen Default-Wert liefert.
   *
   * @function
   * @memberof mainSidebarJS
   * @returns {Promise<Object>} Ein Promise, das die Sidebar-Konfiguration zurückgibt.
   *   Beispiel: `{ clock: 'default', openWeatherMap: { enabled: true } }`.
   */
  loadSidebarConfig() {
    return fetch('data/sidebar.json?v=' + dashboardVersion)
      .then(response => response.json())
      .catch(error => {
        console.error('Fehler beim Laden der Sidebar-Konfiguration:', error);
        return {clock: 'default', openWeatherMap: {enabled: false}};
      });
  },

  /**
   * Klappt die Sidebar ein oder aus, indem die Klasse `.collapsed`
   * auf das Element `.sidebar` getoggelt wird.
   * Anschließend wird `adjustMainContentMargin()` aufgerufen,
   * um den Hauptinhalt anzupassen.
   *
   * @function
   * @memberof mainSidebarJS
   * @returns {void}
   */
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    mainSidebarJS.adjustMainContentMargin();
  },

  /**
   * Initialisiert die Sidebar, indem je nach `sidebarConfig.clock` eine Uhr
   * erzeugt wird (keine, Standard oder analog) und ggf. eine Wetteranzeige
   * (`sidebarWeatherJS`) oder ioBroker-Kalender (`sidebarCalendarJS`) eingebunden wird.
   *
   * @function
   * @memberof mainSidebarJS
   * @returns {void}
   */
  initializeSidebar() {
    const sidebarContent = document.querySelector('.sidebar-content');

    switch (sidebarConfig.clock) {
      case 'none':
        // Keine Uhr anzeigen
        break;
      case 'default':
        sidebarClockJS.createDefaultClock(sidebarContent);
        sidebarClockJS.startDateTimeUpdates();
        break;
      case 'analog':
        sidebarClockJS.createAnalogClock(sidebarContent);
        sidebarClockJS.startAnalogClock();
        break;
      default:
        console.warn(`Unbekannte Uhr-Einstellung: ${sidebarConfig.clock}`);
        break;
    }

    // Wetteranzeige
    if (sidebarConfig.openWeatherMap && sidebarConfig.openWeatherMap.enabled) {
      sidebarWeatherJS.createWeatherDisplay(sidebarContent, sidebarConfig.openWeatherMap);
    }
    // Kalenderanzeige
    if (sidebarConfig.ioBroker_ical && sidebarConfig.ioBroker_ical.enabled) {
      sidebarCalendarJS.startCalendarUpdates();
    }
  },

  /**
   * Passt den linken Rand (`margin-left`) der Hauptinhaltsfläche (und ggf. der Debug-Konsole)
   * an, je nachdem, ob die Sidebar ausgeklappt oder eingeklappt ist.
   * - Für schmale Bildschirme (< 768px) wird kein Abstand gelassen.
   * - Für breitere Bildschirme wird ein Abstand von 400px gesetzt, wenn die Sidebar offen ist.
   *
   * @function
   * @memberof mainSidebarJS
   * @returns {void}
   */
  adjustMainContentMargin() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const debugConsole = document.querySelector('.debug-console');

    if (window.innerWidth > 768) {
      if (sidebar.classList.contains('collapsed')) {
        mainContent.style.marginLeft = '0';
        if (debugConsole) {
          debugConsole.style.marginLeft = '0';
        }
      } else {
        mainContent.style.marginLeft = '400px';
        if (debugConsole) {
          debugConsole.style.marginLeft = '400px';
        }
      }
    } else {
      // Auf schmalen Bildschirmen immer margin=0
      mainContent.style.marginLeft = '0';
      if (debugConsole) {
        debugConsole.style.marginLeft = '0';
      }
    }
  }
};
