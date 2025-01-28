/**
 * Das Modul mainPageJS kapselt die Logik zur Verwaltung und Darstellung
 * der Hauptseiten (Main Pages) des Dashboards.
 * @namespace mainPageJS
 */
const mainPageJS = {

  /**
   * Lädt alle definierten Hauptseiten (Main Pages) und rendert dann
   * je nach verfügbarer Berechtigung die passenden Seiten.
   *
   * - Löscht zuerst alle bisherigen Seiten und Tiles.
   * - Lädt ggf. eine benutzerspezifische Overview-Datei (z. B. `overview_{user}.json`).
   * - Lädt dann alle in der globalen `dashboardConfig.pages` definierten Hauptseiten.
   * - Prüft die `authorization` in den geladenen JSON-Dateien und filtert entsprechend.
   * - Erzeugt dann die Footer-Buttons (Navigation).
   * - Lädt abschließend die erste Seite (oder zeigt eine Fehlermeldung, falls keine vorhanden).
   *
   * @async
   * @returns {Promise<void>} Wird abgeschlossen, wenn alle Seiten geladen und initial gerendert wurden.
   */
  async loadMainPages() {
    try {
      mainPages = [];
      ioBrokerJS.clearPageIds();
      document.querySelector('.main-content').innerHTML = '';

      const DATA_PATH = dashboardConfig.dataFolder + '/';
      const DEFAULT_OVERVIEW_FILE = 'overview.json';

      let overviewPage = null;
      const overviewFile = userLoggedIn && userLoggedIn.trim() !== '' ? `overview_${userLoggedIn}.json` : DEFAULT_OVERVIEW_FILE;

      /**
       * Lädt eine Overview-JSON-Datei vom Server.
       *
       * @param {string} fileName - Name der zu ladenden JSON-Datei.
       * @returns {Promise<object>} Das geparste JSON-Objekt aus der Datei.
       * @throws {Error} Falls die Datei nicht gefunden oder ein Netzwerkfehler auftritt.
       */
      async function fetchOverviewFile(fileName) {
        const res = await fetch(`${DATA_PATH}${fileName}?v=${dashboardVersion}`);
        if (!res.ok) throw new Error(`Datei ${fileName} nicht gefunden.`);
        return await res.json();
      }

      // Versuche, die benutzerspezifische Overview-Datei zu laden
      try {
        overviewPage = await fetchOverviewFile(overviewFile);
      } catch (e) {
        console.error(e.message);
        // Fallback: Standard-Overview
        try {
          overviewPage = await fetchOverviewFile(DEFAULT_OVERVIEW_FILE);
        } catch (innerError) {
          console.error(innerError.message);
        }
      }

      // Lade alle Hauptseiten (gemäß config.json) asynchron
      const pagePromises = dashboardConfig.pages.map(async (file) => {
        const res = await fetch(`${DATA_PATH}main/${file}?v=${dashboardVersion}`);
        if (!res.ok) throw new Error(`Fehler beim Laden von ${file}: ${res.statusText}`);
        return await res.json();
      });

      let loadedPages = await Promise.all(pagePromises);

      // Füge (falls vorhanden) die Overview-Page vorne an
      if (overviewPage) {
        loadedPages.unshift(overviewPage);
      }

      // Filtere Seiten nach Autorisierung (falls in JSON definiert)
      mainPages = loadedPages.filter(page => {
        if (page.authorization) {
          return page.authorization.includes(userLoggedIn);
        }
        return true;
      });

      mainPageJS.createFooterButtons();

      if (mainPages.length > 0) {
        mainPageJS.loadPageContent(mainPages[0]);
      } else {
        document.querySelector('.main-content').innerHTML = '<h2>Keine verfügbaren Seiten für diesen Benutzer.</h2>';
      }

    } catch (error) {
      console.error('Fehler beim Laden der Hauptseiten:', error);
    }
  },

  /**
   * Erstellt Buttons im Footer-Bereich für jede geladene Hauptseite.
   * Jeder Button lädt beim Klick die entsprechende Seite.
   *
   * - Löscht zunächst alte Buttons im Footer (`footer.innerHTML = ''`).
   * - Erstellt für jede Seite einen Button mit Icon (z. B. Font Awesome).
   * - Verknüpft jeden Button über ein Click-Event mit `loadPageContent(page)`.
   */
  createFooterButtons() {
    const footer = document.querySelector('.footer');
    footer.innerHTML = ''; // Vorherige Buttons entfernen

    mainPages.forEach((page, index) => {

      const button = document.createElement('button');
      button.classList.add('btn', 'btn-primary', `btn-${index + 1}`);
      button.title = page.name;

      const icon = document.createElement('i');
      icon.classList.add('fa', page.icon);
      button.appendChild(icon);

      const span = document.createElement('span');
      span.textContent = ` ${page.name}`;
      button.appendChild(span);

      // Event-Listener hinzufügen
      button.addEventListener('click', () => mainPageJS.loadPageContent(page));

      footer.appendChild(button);
    });
  },

  /**
   * Lädt den Inhalt einer Seite.
   *
   * Wenn die Seite durch eine PIN geschützt ist (`pageData.pin`) und man nicht
   * von derselben Seite kommt (`lastPage !== pageData.name`), wird ein PIN-Prompt
   * geöffnet. Anschließend oder wenn keine PIN nötig ist, wird die Seite geladen.
   *
   * @param {object} pageData - Das Seitenobjekt.
   * @param {string} pageData.name - Der Name (Bezeichner) der Seite.
   * @param {string} [pageData.pin] - (Optional) PIN, falls die Seite geschützt ist.
   */
  loadPageContent(pageData) {
    if (pageData.pin && lastPage !== pageData.name) {
      pinJS.showPinPrompt(pageData.pin, () => {
        mainPageJS.actuallyLoadPageContent(pageData);
      });
    } else {
      mainPageJS.actuallyLoadPageContent(pageData);
    }
  },

  /**
   * Lädt den eigentlichen Seiteninhalt und rendert die Elemente im DOM.
   *
   * - Speichert den Namen der geladenen Seite in `lastPage`.
   * - Öffnet ggf. eine zusammengeklappte Sidebar bei kleinen Bildschirmen.
   * - Setzt den Hauptinhalt (`.main-content`) zurück und zeigt ein Verbindungssymbol.
   * - Zeigt den Seitentitel an und erlaubt ein Klick-Event auf diesen Titel,
   *   um alle Kategorien ein- oder auszuklappen.
   * - Unterscheidet zwischen einer `overview`-Seite (ruft `mainDeviceJS.displayItemTiles`) auf
   *   und einer regulären Seite (ruft `displayMainPageItems` auf).
   *
   * @param {object} pageData - Die Datenstruktur zur Seite (inklusive Inhalt).
   */
  actuallyLoadPageContent(pageData) {

    lastPage = pageData.name;

    if (window.innerWidth <= 768) {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
      }
    }

    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = ''; // Vorherigen Inhalt löschen
    ioBrokerJS.clearPageIds();

    const connectionIcon = document.createElement('i');
    connectionIcon.classList.add('fa', 'fa-network-wired', 'connection-icon');
    connectionIcon.style.color = (servConn._isConnected || isDemoVersion) ? 'green' : 'red';
    mainContent.appendChild(connectionIcon);

    const title = document.createElement('h2');
    title.textContent = pageData.name;
    title.id = "page-title";
    mainContent.appendChild(title);

    title.addEventListener('click', () => {
      const categories = mainContent.querySelectorAll('.category');
      categories.forEach(categorySection => {
        const tiles = categorySection.querySelector('.tiles');
        const isCollapsed = categorySection.classList.contains('collapsed');
        const collapseIcon = categorySection.querySelector(".collapse-icon");

        if (isCollapsed) {
          collapseIcon.setAttribute('data-icon', 'angle-up');
        } else {
          collapseIcon.setAttribute('data-icon', 'angle-down');
        }

        categorySection.classList.toggle('collapsed');
        tiles.style.maxHeight = isCollapsed ? tiles.scrollHeight + 'px' : '0';
      });
    });

    if (pageData.type === 'overview') {
      mainDeviceJS.displayItemTiles(pageData.content);
      if (isDemoVersion) {
        demoJS.addDemoUI(mainContent);
      }
    } else {
      pageTypes.push('room');
      mainPageJS.displayMainPageItems(pageData, mainContent);
    }
  },

  /**
   * Rendert die Inhalte der Hauptseite, unterteilt in Kategorien und Tiles.
   *
   * - Durchläuft alle Kategorien im `pageData.content`.
   * - Erzeugt jeweils eine Section pro Kategorie mit Titel, (optionaler) Autorisierung
   *   und einem Collapse-Icon.
   * - Erzeugt in jeder Kategorie die definierten Tiles (Kacheln) samt
   *   möglichen Statusinformationen (Icons, Labels, Werte).
   * - Versteckt ggf. Kacheln, wenn die entsprechenden hidden-States auf `true` stehen.
   * - Überlässt die Logik zum Öffnen von Items (z. B. Geräte-Details) an `mainDeviceJS.openItem(...)`.
   * - Wenn der Demo-Modus aktiv ist, wird `demoJS.addDemoUI()` aufgerufen.
   *
   * @param {object} pageData - Die Datenstruktur für die zu ladende Seite.
   * @param {HTMLElement} mainContent - Das DOM-Element, in das die Seite gerendert wird.   *
   */
  displayMainPageItems(pageData, mainContent) {
    // Verarbeite den Inhalt der Seite
    categoryTiles = [];
    pageData.content.forEach(category => {
      if (category.authorization) {
        if (!category.authorization.includes(userLoggedIn)) {
          return; // Überspringe Kategorien, zu denen der User keine Berechtigung hat
        }
      }

      const categorySection = document.createElement('section');
      categorySection.classList.add('category');

      if (category.collapsed) {
        categorySection.classList.add('collapsed');
      }

      if (category.category) {
        const categoryTitle = document.createElement('h3');

        const titleContainer = document.createElement('div');
        titleContainer.classList.add('category-title-container');

        const titleText = document.createElement('span');
        titleText.textContent = category.category;

        const icon = document.createElement('i');
        icon.classList.add('collapse-icon');
        icon.classList.add('fas');

        // Setze das initiale Icon basierend auf dem Zustand
        if (categorySection.classList.contains('collapsed')) {
          icon.classList.add('fa-angle-down');
        } else {
          icon.classList.add('fa-angle-up');
        }
        titleContainer.appendChild(titleText);
        titleContainer.appendChild(icon);

        categoryTitle.appendChild(titleContainer);
        categorySection.appendChild(categoryTitle)

        categoryTitle.addEventListener('click', () => {
          const isCollapsed = categorySection.classList.contains('collapsed');
          categorySection.classList.toggle('collapsed');
          tilesContainer.style.maxHeight = isCollapsed ? (tilesContainer.scrollHeight + 50) + 'px' : '0';

          const collapseIcon = categorySection.querySelector(".collapse-icon");

          if (isCollapsed) {
            collapseIcon.setAttribute('data-icon', 'angle-up');
          } else {
            collapseIcon.setAttribute('data-icon', 'angle-down');
          }

        });
      }

      const tilesContainer = document.createElement('div');
      tilesContainer.classList.add('tiles');

      category.tiles.forEach(tileData => {

        if (tileData.authorization) {
          if (!tileData.authorization.includes(userLoggedIn)) {
            return; // Überspringe Tiles ohne Berechtigung
          }
        }

        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.onclick = () => mainDeviceJS.openItem(tileData.name, pageData.type, tileData.json);

        // Sammle den Tile-Namen in categoryTiles für spätere Verwendung
        categoryTiles.push(tileData.name);

        // Hidden-Logik: Wenn ein Datenpunkt hinterlegt ist, der die Sichtbarkeit steuert
        if (tileData.hidden) {
          tile.dataset.hiddenId = tileData.hidden;
          ioBrokerJS.addPageId(tileData.hidden, 'hidden');

          const hiddenValue = ioBrokerStates[tileData.hidden]?.val ?? false;
          tile.style.display = formatJS.isTrue(hiddenValue) ? 'none' : '';
        }

        // Bild hinzufügen, wenn vorhanden
        if (tileData.image) {
          const img = document.createElement('img');
          img.src = `assets/img/main/${pageData.type}/${tileData.image}`;
          img.alt = `Bild von ${tileData.name}`;
          img.classList.add('tile-image');
          tile.appendChild(img);
        }

        // Titel der Kachel hinzufügen
        const title = document.createElement('div');
        title.classList.add('tile-title');
        title.textContent = tileData.name || 'Unbenannt';
        tile.appendChild(title);

        // Container für Statusinformationen
        const statusContainer = document.createElement('div');
        statusContainer.classList.add('status-container');

        // Falls es mehrere Statuswerte gibt, werden alle aufgelistet
        if (Array.isArray(tileData.status)) {
          tileData.status.forEach(status => {
            const statusElement = document.createElement('div');
            statusElement.classList.add('status-item');

            // Optionales Icon
            if (status.icon) {
              const icon = document.createElement('i');
              icon.classList.add('fa', status.icon);
              icon.style.marginRight = '5px';
              statusElement.appendChild(icon);
            }

            // Label (Beschreibung)
            const statusLabel = document.createElement('span');
            statusLabel.textContent = `${status.label}: `;
            statusElement.appendChild(statusLabel);

            // Wert (Data-ID für spätere Live-Updates)
            const statusValue = document.createElement('span');
            statusValue.dataset.id = status.value;
            statusValue.dataset.format = JSON.stringify({
              unit: status.unit,
              decimal: status.decimal,
              labels: status.labels,
              error: status.error || "",
              warning: status.warning || "",
              alarm: status.alarm || false
            });

            const val = ioBrokerStates[status.value]?.val ?? "";
            statusValue.textContent = formatJS.formatValue(val, status.unit, status.decimal, status.labels);

            // Wende ggf. Formatierungen (Fehler, Warnung, Alarm) an
            formatJS.applyConditionalFormatting(statusElement, val, status.error, status.warning, status.alarm, tile);

            statusElement.appendChild(statusValue);

            // Füge die Status-ID der Liste der verwendeten Datenpunkte hinzu
            ioBrokerJS.addPageId(status.value, status.unit);

            statusContainer.appendChild(statusElement);
          });
        }

        tile.appendChild(statusContainer);
        tilesContainer.appendChild(tile);
      });

      categorySection.appendChild(tilesContainer);
      mainContent.appendChild(categorySection);

      // Setze die initiale maxHeight nach dem Anhängen an den DOM
      requestAnimationFrame(() => {
        const height = tilesContainer.scrollHeight + 10;
        tilesContainer.style.maxHeight = categorySection.classList.contains('collapsed') ? '0' : height + 'px';
        tilesContainer.style.height = height + 'px';
      });
    });

    if (isDemoVersion) {
      demoJS.addDemoUI(mainContent);
    }

  }

}
