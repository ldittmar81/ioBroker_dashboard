/**
 * Fetch-Aufruf zum Laden der `config.json`.
 * - Wird die Datei korrekt geladen, wird in `dashboardConfig` gespeichert.
 * - Aktiviert die Debug-Konsole, falls in der Config `console` auf true gesetzt ist.
 * - Startet den Live- oder Demo-Modus basierend auf `dashboardConfig.mode`.
 */
fetch('config.json?v=' + dashboardVersion)
  .then(response => {
    if (!response.ok) {
      throw new Error('Netzwerkantwort war nicht ok ' + response.statusText);
    }
    return response.json();
  })
  .then(configData => {
    dashboardConfig = configData;

    // Wenn in config 'console' auf true gesetzt ist, wird die Debug-Konsole aktiviert
    if (dashboardConfig.console) consoleJS.initDebugConsole();

    // Unterscheide zwischen 'live' und 'demo' Modus
    if (dashboardConfig.mode !== 'demo') {
      // Live-Modus: Lade-Overlay anzeigen und Verbindung zu ioBroker aufbauen
      startAppJS.showLoadingOverlay();
      ioBrokerJS.initializeConnection();
    } else {
      // Demo-Modus: demo.json als zusätzliche Seite laden
      dashboardConfig.pages.push('demo.json');
      demoJS.initializeDemoConnection();
    }

  })
  .catch(error => {
    console.error('Fehler beim Laden der Konfigurationsdatei:', error);
  });

// Wenn das Browserfenster geändert wird (Resize),
// warte kurz und rufe Funktionen zum Layout-Update auf.
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    mainSidebarJS.adjustMainContentMargin();
    startAppJS.updateTilesContainerHeights();
  }, 100);
});

/**
 * Ein Objekt mit Funktionen zum Starten und Steuern der Hauptapp,
 * u.a. ein Lade-Overlay (Splash) und Tile-Layout-Anpassungen.
 *
 * @namespace startAppJS
 */
const startAppJS = {

  /**
   * Passt die Höhen der .tiles-Container in allen .category-Abschnitten an.
   * - Entfernt zunächst die `height`-Angabe,
   * - ermittelt dann `scrollHeight` und setzt `height` und `maxHeight` entsprechend.
   * - Für zusammengeklappte Kategorien (Klasse `.collapsed`) wird `maxHeight = 0` gesetzt.
   *
   * @function
   * @memberof startAppJS
   * @returns {void}
   */
  updateTilesContainerHeights() {
    const categorySections = document.querySelectorAll('.category');
    categorySections.forEach(categorySection => {
      const tilesContainers = categorySection.querySelectorAll('.tiles');
      tilesContainers.forEach(tilesContainer => {
        tilesContainer.style.removeProperty('height');
        const height = tilesContainer.scrollHeight + 10;
        tilesContainer.style.maxHeight = categorySection.classList.contains('collapsed') ? '0' : height + 'px';
        tilesContainer.style.height = height + 'px';
      });
    });
  },

  /**
   * Zeigt ein Lade-Overlay an (Element mit ID `loading-overlay`),
   * das mit einem Countdown herunterzählt (beginnend bei 10 s).
   * Nach Ablauf des Countdowns wird `hideLoadingOverlay()` aufgerufen (falls noch sichtbar).
   *
   * @function
   * @memberof startAppJS
   * @returns {void}
   */
  showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
    loaderVisible = true;

    const countdownElement = document.getElementById('loader-countdown');
    let countdown = 10;
    countdownElement.textContent = `Wird in ${countdown} Sekunden gestartet...`;

    // Falls es vorher einen Interval gab, löschen wir diesen
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        countdownElement.textContent = `Wird in ${countdown} Sekunden gestartet...`;
      } else {
        // Countdown ist bei 0
        clearInterval(countdownInterval);
        countdownElement.textContent = `Wird gestartet...`;
        // Wenn der Loader noch sichtbar ist, blenden wir ihn jetzt aus
        if (loaderVisible) {
          startAppJS.hideLoadingOverlay();
        }
      }
    }, 1000);
  },

  /**
   * Blendet das Lade-Overlay aus (Element mit ID `loading-overlay`),
   * und stoppt den Countdown-Interval.
   *
   * @function
   * @memberof startAppJS
   * @returns {void}
   */
  hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('hidden');
    loaderVisible = false;

    // Countdown abbrechen, falls noch aktiv
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }
}
