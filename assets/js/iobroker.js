/**
 * Das Modul ioBrokerJS kümmert sich um die Verbindung zu ioBroker,
 * das Verwalten und Aktualisieren von States, sowie das Initialisieren der UI.
 *
 * @namespace ioBrokerJS
 */
const ioBrokerJS = {

  /**
   * Wird aufgerufen, sobald eine stabile ioBroker-Verbindung besteht und die States geladen sind.
   * Diese Methode:
   * 1. Initialisiert das Benutzerprofil (ruft `loginJS.initializeUserProfile` auf).
   * 2. Lädt die Hauptseiten (`mainPageJS.loadMainPages`).
   * 3. Lädt das Sidebar-Konfigurationsobjekt (`mainSidebarJS.loadSidebarConfig`),
   *    um anschließend das Sidebar-Menü zu initialisieren.
   * 4. Blendet das Lade-Overlay aus, sobald alles geladen ist.
   *
   * @function
   * @memberof ioBrokerJS
   * @returns {void}
   */
  initializePage() {
    loginJS.initializeUserProfile().then(() => {
      mainPageJS.loadMainPages().then(() => {
        mainSidebarJS.loadSidebarConfig().then(config => {
          sidebarConfig = config;
          mainSidebarJS.initializeSidebar();
        });
        startAppJS.hideLoadingOverlay(); // Lade-Overlay ausblenden
      });
    });
  },

  /**
   * Baut die Verbindung zu ioBroker auf und legt die Callbacks für
   * Verbindungsstatus und State-Updates fest.
   * - Bei erfolgreicher Verbindung werden einmalig alle States (`servConn.getStates`) geladen
   *   und anschließend `ioBrokerJS.initializePage()` aufgerufen.
   * - Bei Verbindungsverlust wird die Verbindung erneut versucht; schlägt es erneut fehl,
   *   wird die Seite neu geladen.
   * - State-Updates werden über `onUpdate` empfangen und in die UI übernommen.
   *
   * @function
   * @memberof ioBrokerJS
   * @returns {void}
   */
  initializeConnection() {
    servConn.namespace = 'dashboard-connection';
    servConn._useStorage = false;

    servConn.init(
      {
        connLink: dashboardConfig.connLink,
        name: 'dashboard-connection',
        socketSession: dashboardConfig.socketSession || ''
      },
      {
        /**
         * Callback, wenn sich der Verbindungsstatus zu ioBroker ändert.
         * @param {boolean} isConnected - True, wenn mit ioBroker verbunden; false sonst.
         */
        onConnChange: (isConnected) => {
          const connectionIcon = document.querySelector('.connection-icon');
          if (connectionIcon) {
            connectionIcon.style.color = isConnected ? 'green' : 'red';
          }

          if (isConnected) {
            console.log("Mit ioBroker verbunden.");
            connectionsTry = 0;
            // Nach Verbindungsaufbau: Lade alle States
            servConn.getStates((err, _states) => {
              if (err) {
                console.error("Fehler beim Laden der States:", err);
                return;
              }
              const count = Object.keys(_states).length;
              console.log('Received ' + count + ' states.');
              ioBrokerStates = _states;
              // Seite initialisieren
              ioBrokerJS.initializePage();
            });
          } else {
            // Bei Verbindungsverlust
            console.warn("Verbindung zu ioBroker verloren. Versuch: " + connectionsTry);
            if (connectionsTry > 0) {
              // Wenn schon einmal versucht: Seite neu laden
              window.location.reload();
            }
            connectionsTry++;
          }
        },
        /**
         * Callback, wenn ein State in ioBroker aktualisiert wurde.
         * @param {string} id - Die State-ID, die sich geändert hat.
         * @param {object} state - Das neue State-Objekt.
         */
        onUpdate: (id, state) => {
          // Asynchron setzen, um UI-Blockaden zu vermeiden
          setTimeout(() => {
            ioBrokerStates[id] = state;
            // Wenn die ID auf der aktuellen Seite genutzt wird, update UI
            if (pageIds.includes(id)) {
              mainUpdaterJS.updateUIForID(id, state);
            }
          }, 0);
        },
        /**
         * Callback für Verbindungsfehler zu ioBroker.
         * @param {Error} error - Enthält Informationen zum Fehler.
         */
        onError: (error) => {
          console.error("Verbindungsfehler:", error);
        },
      },
      true,
      true
    );
  },

  /**
   * Sendet einen neuen Wert an einen bestimmten ioBroker State.
   * - Im Live-Betrieb wird `servConn.setState` genutzt.
   * - Im Demo-Modus wird nur lokal simuliert.
   *
   * @function
   * @memberof ioBrokerJS
   * @param {string} stateId - Die zu ändernde State-ID in ioBroker.
   * @param {*} value - Der neue Wert, der gesetzt werden soll.
   * @returns {void}
   */
  sendCommand(stateId, value) {
    if (!isDemoVersion) {
      servConn.setState(stateId, value, (err) => {
        if (err) {
          console.error(`Fehler beim Senden des Befehls an ${stateId}:`, err);
        } else {
          console.log(`Befehl an ${stateId} erfolgreich gesendet: ${value}`);
        }
      });
    } else {
      // Demo-Modus: Wert nur lokal setzen
      const state = demoJS.getDemoState(value);
      ioBrokerStates[stateId] = state;
      mainUpdaterJS.updateUIForID(stateId, state);
      console.log(`Befehl an ${stateId} erfolgreich gesendet: ${value} (Demo-Modus)`);
    }
  },

  /**
   * Registriert eine State-ID für die aktuelle Seite, sodass Änderungen
   * daran (durch `onUpdate`) direkt in der UI angezeigt werden können.
   * - Im Demo-Modus wird zusätzlich ein Demowert initialisiert (`demoJS.addDemoValue`).
   *
   * @function
   * @memberof ioBrokerJS
   * @param {string} id - Die zu registrierende State-ID.
   * @param {string} [unit] - (Optional) Einheit, z.B. '°C'.
   * @param {string} [valueType] - (Optional) Datentyp, z.B. 'boolean', 'number'.
   * @returns {void}
   */
  addPageId(id, unit, valueType) {
    if (id && !pageIds.includes(id)) {
      pageIds.push(id);
    }

    if (isDemoVersion) {
      demoJS.addDemoValue(id, unit, valueType);
    }
  },

  /**
   * Leert die Liste der State-IDs (`pageIds`) und `pageTypes`,
   * die für die aktuelle Seite registriert sind.
   * Dies wird z.B. aufgerufen, bevor eine neue Seite geladen wird.
   *
   * @function
   * @memberof ioBrokerJS
   * @returns {void}
   */
  clearPageIds() {
    pageIds = [];
    pageTypes = [];
  }
};
