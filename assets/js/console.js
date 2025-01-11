/**
 * Das Modul consoleJS initialisiert eine benutzerdefinierte Debug-Konsole im Browserfenster.
 * Hierdurch werden Konsolenausgaben (console.log, console.warn, console.error) in ein eigenes
 * scrollbares und pausierbares Fenster umgeleitet.
 *
 * @namespace consoleJS
 */
const consoleJS = {

  /**
   * Initialisiert die Debug-Konsole im DOM, überschreibt die originalen
   * Konsolenmethoden und fügt einen Pause/Play-Button hinzu.
   *
   * - Erstellt eine Toolbar mit Pause-/Play-Funktion.
   * - Leitet console.log, console.warn und console.error auf ein DIV-Element um,
   *   das mit Zeitstempeln und entsprechender Farbcodierung arbeitet.
   * - Begrenzt die Anzahl der Zeilen, um Speicher zu schonen.
   * - Ermöglicht das „Pausieren“ der Anzeige, um bei Bedarf Log-Meldungen später
   *   zu inspizieren.
   *
   * @function
   * @memberof consoleJS
   * @returns {void}
   */
  initDebugConsole() {
    const debugConsole = document.getElementById('debug-console');
    const debugConsoleContent = document.getElementById('debug-console-content');

    // Debug-Konsole anzeigen und als aktiv markieren
    debugConsole.classList.remove('hidden');
    debugConsole.classList.add('active');

    // Originale Konsolenmethoden sichern
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    let paused = false;        // Status, ob die Ausgabe pausiert ist
    let messageQueue = [];     // Nachrichten, die während der Pause gesammelt werden
    const MAX_LINES = 500;     // Maximale Anzahl an anzeigbaren Zeilen

    // Eine Toolbar über dem Konsoleninhalt hinzufügen, um den Pausenstatus zu steuern
    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'flex-end';
    toolbar.style.padding = '5px';
    toolbar.style.backgroundColor = 'black';

    // Pause/Play-Button erstellen
    const pauseButton = document.createElement('button');
    pauseButton.textContent = 'Pause';
    pauseButton.style.marginRight = '5px';
    pauseButton.style.backgroundColor = 'black';
    pauseButton.style.color = 'green';
    pauseButton.style.border = '1px solid green';
    pauseButton.style.cursor = 'pointer';
    pauseButton.style.fontFamily = 'monospace';

    pauseButton.addEventListener('click', () => {
      paused = !paused;
      pauseButton.textContent = paused ? 'Play' : 'Pause';

      // Wenn wieder "Play" gedrückt wird, alle zwischengespeicherten Nachrichten ausgeben
      if (!paused) {
        while (messageQueue.length > 0) {
          const {message, type} = messageQueue.shift();
          appendLine(message, type);
        }
      }
    });

    toolbar.appendChild(pauseButton);
    debugConsole.insertBefore(toolbar, debugConsoleContent);

    /**
     * Hilfsfunktion zum Hinzufügen einer neuen Zeile mit Zeitstempel
     * und passender Farbcodierung in die Debug-Konsole.
     *
     * @param {string} text - Die auszugebende Nachricht
     * @param {'log'|'warn'|'error'} [type='log'] - Der Nachrichtentyp
     */
    function appendLine(text, type = 'log') {
      const line = document.createElement('div');
      if (type === 'warn') {
        line.style.color = 'yellow';
      } else if (type === 'error') {
        line.style.color = 'red';
      } else {
        line.style.color = 'green';
      }

      // Zeitstempel generieren (YYYY-MM-DD HH:MM:SS)
      const now = new Date();
      const timestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

      line.textContent = `[${timestamp}] ${text}`;
      debugConsoleContent.appendChild(line);

      // Älteste Zeilen entfernen, wenn das Limit überschritten wird
      while (debugConsoleContent.children.length > MAX_LINES) {
        debugConsoleContent.removeChild(debugConsoleContent.firstChild);
      }

      // Automatisch nach unten scrollen, um immer die neuesten Nachrichten zu sehen
      debugConsoleContent.scrollTop = debugConsoleContent.scrollHeight;
    }

    /**
     * Gibt eine Nachricht in unsere Debug-Konsole aus bzw. sammelt sie,
     * wenn pausiert ist.
     *
     * @param {string} message - Die anzuzeigende Nachricht
     * @param {'log'|'warn'|'error'} [type='log'] - Der Nachrichtentyp
     */
    function printToDebugConsole(message, type = 'log') {
      if (paused) {
        // Wenn pausiert, wird die Nachricht zwischengespeichert
        messageQueue.push({message, type});
      } else {
        // Direkt anzeigen
        appendLine(message, type);
      }
    }

    // Überschreiben der originalen Konsolenmethoden
    console.log = function (...args) {
      origLog.apply(console, args);
      printToDebugConsole(args.join(' '), 'log');
    };

    console.warn = function (...args) {
      origWarn.apply(console, args);
      printToDebugConsole(args.join(' '), 'warn');
    };

    console.error = function (...args) {
      origError.apply(console, args);
      printToDebugConsole(args.join(' '), 'error');
    };

    // Startnachricht anzeigen
    console.log('Debug-Konsole aktiviert.');
  }
};
