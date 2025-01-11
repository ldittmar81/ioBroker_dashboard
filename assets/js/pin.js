/**
 * Das Modul pinJS enthält Funktionen für eine PIN-Abfrage mittels Overlay.
 *
 * @namespace pinJS
 */
const pinJS = {

  /**
   * Zeigt ein Overlay an, in dem der Benutzer eine 4-stellige PIN (Ziffern) eingeben muss.
   * - Wenn die PIN korrekt ist, werden kurz visuelle Effekte angezeigt (grüne Punkte)
   *   und die Overlay-Eingabe wird geschlossen.
   * - Wenn die PIN falsch ist, werden die Punkte kurz rot gefärbt und vibrieren (klassisches „falsches Passwort“-Feedback).
   * - Eine Abbrechen-Taste (Esc oder „X“-Symbol) schließt das Overlay ohne Erfolg.
   *
   * @function
   * @memberof pinJS
   * @param {string} correctPin - Die korrekte PIN (genau 4 Ziffern).
   * @param {Function} onSuccess - Callback-Funktion, die aufgerufen wird,
   *        wenn der Benutzer die korrekte PIN eingegeben hat.
   * @returns {void}
   */
  showPinPrompt(correctPin, onSuccess) {
    // Overlay für die PIN-Abfrage erstellen
    const pinOverlay = document.createElement('div');
    pinOverlay.id = 'pin-overlay';

    // Container für die Inhalte des PIN-Prompts
    const pinPrompt = document.createElement('div');
    pinPrompt.id = 'pin-prompt';

    // Erstelle die Indikatoren (Dots) für die eingegebenen Ziffern
    const dotsContainer = document.createElement('div');
    dotsContainer.classList.add('dots');

    const dots = [];
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      dotsContainer.appendChild(dot);
      dots.push(dot);
    }

    // Kurzer Hinweistext für den Benutzer
    const message = document.createElement('p');
    message.textContent = 'Bitte PIN eingeben';

    // Container für die Zahlentasten
    const numbersContainer = document.createElement('div');
    numbersContainer.classList.add('numbers');

    // Variable zum Speichern der momentan eingegebenen PIN
    let input = '';

    // Layout des Keypads (4 Reihen: 1-9, 0, Abbrechen und Löschen)
    const keypadLayout = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['cancel', '0', 'delete']
    ];

    // Array, um die Zahlentasten (ohne cancel und delete) zu speichern
    const numbers = [];

    // Erstelle die einzelnen Reihen und Tasten
    keypadLayout.forEach(rowValues => {
      const row = document.createElement('div');
      row.classList.add('number-row');
      rowValues.forEach(value => {
        const numberButton = document.createElement('div');
        numberButton.classList.add('number');

        if (value === 'delete') {
          // Löschtaste
          numberButton.classList.add('delete');
          const icon = document.createElement('i');
          icon.classList.add('fa', 'fa-delete-left');
          numberButton.appendChild(icon);
          numberButton.addEventListener('click', () => {
            handleDelete();
          });
        } else if (value === 'cancel') {
          // Abbrechen-Taste
          numberButton.classList.add('cancel');
          const icon = document.createElement('i');
          icon.classList.add('fa', 'fa-xmark');
          numberButton.appendChild(icon);
          numberButton.addEventListener('click', () => {
            closePinPrompt();
          });
        } else {
          // Eine Zahlentaste
          numberButton.textContent = value;
          numbers.push(numberButton);
          numberButton.addEventListener('click', () => {
            handleNumberInput(value);
          });
        }
        row.appendChild(numberButton);
      });
      numbersContainer.appendChild(row);
    });

    // Alle Elemente in das PIN-Prompt einfügen
    pinPrompt.appendChild(dotsContainer);
    pinPrompt.appendChild(message);
    pinPrompt.appendChild(numbersContainer);

    // PIN-Prompt ins Overlay setzen und dieses im Body einfügen
    pinOverlay.appendChild(pinPrompt);
    document.body.appendChild(pinOverlay);

    // Fokus setzen, damit Tastatureingaben abgefangen werden
    pinPrompt.tabIndex = -1;
    pinPrompt.focus();

    // Tastaturevents behandeln (Ziffern, Backspace, Escape)
    function onKeyDown(event) {
      if (event.key >= '0' && event.key <= '9') {
        handleNumberInput(event.key);
      } else if (event.key === 'Backspace') {
        handleDelete();
      } else if (event.key === 'Escape') {
        closePinPrompt();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    /**
     * Verarbeitet die Eingabe einer Ziffer (sowohl Mausklick als auch Tastatur).
     * Sobald 4 Ziffern erreicht wurden, wird geprüft, ob die PIN korrekt ist.
     *
     * @param {string} value - Eine einzelne Ziffer (0-9).
     * @returns {void}
     */
    function handleNumberInput(value) {
      input += value;
      const currentLength = input.length;
      if (currentLength <= 4) {
        dots[currentLength - 1].classList.add('active');
      }

      if (input.length >= 4) {
        // Nach vier Ziffern prüfen, ob PIN korrekt ist
        if (input === correctPin) {
          // Richtige PIN eingegeben
          dots.forEach((dot) => dot.classList.add('correct'));
          setTimeout(() => {
            closePinPrompt();
            onSuccess();
          }, 500);
        } else {
          // Falsche PIN, alle Dots rot färben und wackeln lassen
          dots.forEach((dot) => dot.classList.add('wrong'));
          setTimeout(() => {
            dots.forEach((dot) => dot.className = 'dot');
            input = '';
          }, 900);
        }
      }
    }

    /**
     * Löschtaste oder Backspace: Entfernt die letzte eingegebene Ziffer.
     * @returns {void}
     */
    function handleDelete() {
      if (input.length > 0) {
        input = input.slice(0, -1);
        dots[input.length].classList.remove('active');
      }
    }

    /**
     * Schließt das PIN-Overlay und entfernt alle Eventlistener.
     * @returns {void}
     */
    function closePinPrompt() {
      document.removeEventListener('keydown', onKeyDown);
      document.body.removeChild(pinOverlay);
    }
  }
};
