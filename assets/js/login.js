/**
 * Das Modul loginJS kümmert sich um das Laden und Verwalten von Benutzerdaten (Login),
 * das Aktualisieren des Benutzerprofils und benutzerspezifische CSS-Variablen.
 *
 * @namespace loginJS
 */
const loginJS = {

  /**
   * @typedef {Object} User
   * @property {string} user - Der eindeutige Benutzername (Login-Name).
   * @property {string} [name] - Anzeigename des Benutzers.
   * @property {string} [icon] - Pfad oder Dateiname des Benutzer-Icons.
   * @property {string} [pin] - Eine PIN, falls der Benutzer passwortgeschützt ist.
   */

  /**
   * Lädt die Liste der Benutzer aus der Datei users.json.
   * Tritt ein Fehler auf, wird das `users`-Array geleert, um einen Fallback zu ermöglichen.
   *
   * @async
   * @function
   * @memberof loginJS
   * @returns {Promise<void>} Promise, das erfüllt wird, wenn die Benutzerliste geladen wurde.
   */
  async loadUsers() {
    try {
      const res = await fetch('data/users.json?v=' + dashboardVersion);
      if (!res.ok) {
        throw new Error(`Fehler beim Laden von users.json: ${res.statusText}`);
      }
      users = await res.json();
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      // Falls ein Fehler auftritt, wird ein leeres Array angenommen,
      // damit die Anwendung weiterlaufen kann.
      users = [];
    }
  },

  /**
   * Initialisiert das Benutzerprofil:
   * - Lädt die Benutzerliste.
   * - Prüft, ob im localStorage ein eingeloggter Benutzer hinterlegt ist und aktualisiert das Profil entsprechend.
   * - Lädt benutzerspezifische Variablen (CSS).
   * - Registriert einen Klick-Eventlistener auf das Benutzerbild, um das Menü (Ein-/Ausblenden) zu steuern.
   *
   * @async
   * @function
   * @memberof loginJS
   * @returns {Promise<void>} Promise, das erfüllt wird, wenn die Initialisierung abgeschlossen ist.
   */
  async initializeUserProfile() {
    await loginJS.loadUsers();

    // Prüft, ob im localStorage ein Benutzername gespeichert ist
    const savedUser = localStorage.getItem('loggedInUser');
    let user = null;
    if (savedUser) {
      user = users.find(u => u.user === savedUser);
      if (user) {
        userLoggedIn = user.user;
        loginJS.updateUserProfile(user);
      } else {
        // Falls der gespeicherte Benutzer nicht mehr in users vorhanden ist,
        // zurück auf anonym setzen
        userLoggedIn = '';
        loginJS.updateUserProfile(null);
      }
    } else {
      // Kein gespeicherter Benutzer (Anonym)
      userLoggedIn = '';
      loginJS.updateUserProfile(null);
    }

    // Benutzerspezifische Variablen (Layout-Farben usw.) laden
    loginJS.loadUserVariables(user);

    // Klick auf das Benutzerbild, um das Benutzermenü anzuzeigen
    const userImage = document.getElementById('user-image');
    userImage.addEventListener('click', loginJS.toggleUserMenu);
  },

  /**
   * Aktualisiert das Benutzerprofilbild oben rechts.
   * - Falls ein Benutzer eingeloggt ist und ein Icon definiert ist, wird dieses Bild verwendet.
   * - Sonst wird ein Standardbild (anonym.png) gesetzt.
   *
   * @function
   * @memberof loginJS
   * @param {User|null} user - Das Benutzerobjekt oder `null`, wenn kein Benutzer eingeloggt ist.
   */
  updateUserProfile(user) {
    const userImage = document.getElementById('user-image');
    if (user && user.icon) {
      userImage.src = `assets/img/users/${user.icon}`;
      userImage.alt = user.name;
    } else {
      userImage.src = `assets/img/users/anonym.png`;
      userImage.alt = 'Anonymer Benutzer';
    }
  },

  /**
   * Zeigt oder versteckt das Benutzermenü beim Klick auf das Benutzerbild.
   * Ruft ggf. `populateUserMenu()` auf, um das Menü mit Benutzern zu füllen.
   *
   * @function
   * @memberof loginJS
   */
  toggleUserMenu() {
    const userMenu = document.getElementById('user-menu');
    userMenu.classList.toggle('hidden');

    if (!userMenu.classList.contains('hidden')) {
      loginJS.populateUserMenu();
    }
  },

  /**
   * Befüllt das Benutzermenü mit allen verfügbaren Nutzern (inkl. „Anonym“).
   * Jeder Eintrag zeigt das Benutzer-Icon, den Namen, und ist klickbar,
   * um diesen Benutzer auszuwählen.
   *
   * @function
   * @memberof loginJS
   */
  populateUserMenu() {
    const userMenu = document.getElementById('user-menu');
    userMenu.innerHTML = ''; // Vorherige Einträge entfernen

    // "Anonym" als speziellen Benutzer hinzufügen
    const anonymousUser = {
      user: '',
      name: 'Anonym',
      icon: 'anonym.png',
    };

    // Gesamte Liste: zuerst anonym, dann alle realen Benutzer
    const allUsers = [anonymousUser, ...users];

    allUsers.forEach(user => {
      const menuItem = document.createElement('div');
      menuItem.classList.add('user-menu-item');
      menuItem.dataset.user = user.user;

      const img = document.createElement('img');
      img.src = `assets/img/users/${user.icon}`;
      img.alt = user.name;

      const span = document.createElement('span');
      span.textContent = user.name;

      menuItem.appendChild(img);
      menuItem.appendChild(span);

      // Beim Klick auf einen Benutzer im Menü wird dieser ausgewählt
      menuItem.addEventListener('click', () => loginJS.selectUser(user));

      userMenu.appendChild(menuItem);
    });
  },

  /**
   * Wird aufgerufen, wenn ein Benutzer im Menü ausgewählt wird.
   * - Hat der Benutzer eine PIN, wird eine PIN-Abfrage gestartet.
   * - Falls erfolgreich (oder keine PIN nötig), wird der Benutzer eingeloggt.
   * - Benutzer-spezifische Variablen (CSS) werden geladen.
   * - Anschließend werden die Hauptseiten neu geladen.
   *
   * @function
   * @memberof loginJS
   * @param {User} user - Das ausgewählte Benutzerobjekt.
   */
  selectUser(user) {
    const userMenu = document.getElementById('user-menu');
    userMenu.classList.add('hidden'); // Menü schließen

    if (user.pin) {
      // PIN-Abfrage, wenn vorhanden
      pinJS.showPinPrompt(user.pin, () => {
        userLoggedIn = user.user;
        loginJS.updateUserProfile(user);
        localStorage.setItem('loggedInUser', user.user);
        loginJS.loadUserVariables(user);
        mainPageJS.loadMainPages();
      });
    } else {
      // Kein PIN nötig, direkt einloggen
      userLoggedIn = user.user;
      loginJS.updateUserProfile(user);
      localStorage.setItem('loggedInUser', user.user);
      loginJS.loadUserVariables(user);
      mainPageJS.loadMainPages();
    }
  },

  /**
   * Lädt die benutzerspezifischen CSS-Variablen (Farbschema) von einer separaten Datei.
   * - Entfernt vorherigen Link-Tag (falls vorhanden).
   * - Prüft, ob die CSS-Datei existiert; wenn ja, wird sie eingebunden.
   *
   * @function
   * @memberof loginJS
   * @param {User|null} user - Das aktuell eingeloggte Benutzerobjekt oder `null` (anonym).
   */
  loadUserVariables(user) {
    // Vorherige Benutzer-CSS entfernen
    const existingLink = document.getElementById('user-variables');
    if (existingLink) {
      existingLink.parentNode.removeChild(existingLink);
    }

    // Wenn kein Benutzer aktiv oder keine spezifische Datei
    if (!user || !user.user) {
      return;
    }

    const cssFile = `assets/css/users/${user.user}.css?v=${dashboardVersion}`;

    // Prüfen, ob die Datei existiert (HEAD-Request)
    fetch(cssFile, {method: 'HEAD'})
      .then(res => {
        if (res.ok) {
          // Datei existiert, CSS laden
          const link = document.createElement('link');
          link.id = 'user-variables';
          link.rel = 'stylesheet';
          link.href = cssFile;
          document.head.appendChild(link);
        }
      })
      .catch(() => {
        console.warn(`Keine benutzerspezifische CSS-Datei für ${user.user} gefunden.`);
      });
  }
}
