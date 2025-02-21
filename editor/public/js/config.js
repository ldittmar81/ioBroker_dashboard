const configJS = {
  currentFile: null,
  createFormFromSchema(schema, jsonData = {}) {
    editorJS.showEditor(); // Wechsle zur Editor-Ansicht
    editorForm.innerHTML = ''; // Bestehendes Formular löschen
    mainSchema = schema;
    subtypeDeviceSelected = '';
    subtypeControlSelected = '';

    editorForm.appendChild(editorJS.createHeader(`Bearbeite: ${this.currentFile || 'Neue Konfiguration'}`));

    // Durch alle Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const isRequired = schema.required?.includes(key);

      const value = jsonData[key] !== undefined ? jsonData[key] : fieldSchema.default || '';

      if (key === 'pages') {
        const container = editorJS.createFormFieldContainer(fieldSchema, key, isRequired);

        const pagesContainer = document.createElement('div');
        pagesContainer.id = 'pages-container';
        pagesContainer.classList.add('pages-container');

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'pages-hidden-input';
        hiddenInput.name = key;
        hiddenInput.value = JSON.stringify(value || []);
        hiddenInput.dataset.type = 'json';

        const currentPages = Array.isArray(value) ? [...value] : []; // Kopie des Arrays
        this.renderPages(currentPages, pagesContainer);

        const addPageButton = document.createElement('button');
        addPageButton.textContent = 'Neue Seite hinzufügen';
        addPageButton.type = 'button';
        addPageButton.addEventListener('click', () => {
          this.addNewPage(pagesContainer, currentPages);
          editorJS.updateHiddenInput(hiddenInput, currentPages);
        });

        container.appendChild(pagesContainer);
        container.appendChild(addPageButton);
        container.appendChild(hiddenInput);

        editorForm.appendChild(container);
      }
      else if (key === 'dataFolder') {
        const container = editorJS.createFormFieldContainer(fieldSchema, key, isRequired);

        const input = document.createElement('select');
        input.id = key;
        input.name = key;

        // Feste Optionen hinzufügen
        ['data', 'private'].forEach((folder) => {
          const opt = document.createElement('option');
          opt.value = folder;
          opt.textContent = folder;
          opt.selected = folder === value;
          input.appendChild(opt);
        });

        // Dynamische Ordner hinzufügen
        ipcRenderer.invoke('get-root-folders').then((folders) => {
          folders.forEach((folder) => {
            const opt = document.createElement('option');
            opt.value = folder;
            opt.textContent = folder;
            opt.selected = folder === value;
            input.appendChild(opt);
          });
        });

        // Button "Ordner anlegen"
        const createFolderButton = document.createElement('button');
        createFolderButton.textContent = 'Ordner anlegen';
        createFolderButton.type = 'button';
        createFolderButton.classList.add('create-folder-btn');
        createFolderButton.addEventListener('click', () => {
          this.showFolderCreationPrompt().then((newFolder) => {
            if (newFolder) {
              ipcRenderer.invoke('create-folder', newFolder).then((success) => {
                if (success) {
                  modalJS.showModal(`Ordner "${newFolder}" wurde erfolgreich erstellt.`);
                  this.updateDataFolderSelect(input, newFolder); // Dropdown aktualisieren und neuen Ordner auswählen
                } else {
                  modalJS.showModal('Fehler beim Erstellen des Ordners.');
                }
              });
            }
          });
        });

        container.appendChild(input);
        container.appendChild(createFolderButton);

        editorForm.appendChild(container);
      }
      else {
        const field = editorJS.generateFormField('config', '', key, fieldSchema, value, isRequired);
        if (field) editorForm.appendChild(field);
      }
    });

    const actions = editorJS.createButtons(() => {
      this.saveConfigData(jsonData);
    });
    editorForm.appendChild(actions);

    const additionalActions = this.createAdditionalConfigActions();
    editorForm.appendChild(additionalActions);
  },

  createAdditionalConfigActions() {
    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('additional-config-actions');

    const filePath = `${currentDataFolder}/ioBroker_IDs.json`; // Pfad zur ID-Datei
    const button = document.createElement('button');
    button.type = 'button';

    const idCountDisplay = document.createElement('span');
    idCountDisplay.classList.add('id-count-display');
    idCountDisplay.style.marginLeft = '10px';

    // Funktion zum Aktualisieren des Buttons und der ID-Anzeige
    const updateButtonAndDisplay = async () => {
      try {
        const exists = await ipcRenderer.invoke('check-file-existence', filePath);
        if (!exists) {
          // Datei existiert nicht
          button.textContent = 'ioBroker IDs Liste erzeugen';
          idCountDisplay.textContent = '(0 IDs)';
          button.disabled = false;
          return;
        }
        // Datei existiert -> Inhalt lesen
        const data = await ipcRenderer.invoke('read-file', filePath);
        const parsedData = JSON.parse(data);
        const idCount = parsedData.length;

        button.textContent = 'ioBroker IDs Liste erneuern';
        idCountDisplay.textContent = `(${idCount} IDs)`;
        button.disabled = false;
      }
      catch (error) {
        logdata('Fehler beim Lesen der ID-Datei: ' + error, 'error');
        button.textContent = 'ioBroker IDs Liste erneuern';
        idCountDisplay.textContent = '(Fehler beim Laden der IDs)';
        button.disabled = true;
      }
    };

    // Funktion zum Initialisieren der ioBroker-Verbindung
    const initializeConnection = async () => {
      const host = document.querySelector('#host')?.value || '192.168.0.50';
      const port = document.querySelector('#port')?.value || '8081';

      if (!host || !port || !host.trim() || !port.trim() || isNaN(port) || port < 1 || port > 65535) {
        logdata('Keine Verbindungsdaten gefunden.', 'error');
        modalJS.showModal('Fehlende Verbindungsdaten für ioBroker.');
        return null; // Abbruch
      }

      const adminConnection = new window.AdminConnection({
        protocol: 'ws',
        host: host,
        port: port,
        admin5only: false,
        autoSubscribes: []
      });

      await adminConnection.startSocket();
      await adminConnection.waitForFirstConnection();

      return adminConnection;
    };

    // Event-Listener für den Button
    button.addEventListener('click', async () => {
      const adminConnection = await initializeConnection();
      if (!adminConnection){
        logdata('Fehler beim Initialisieren der Verbindung.', 'error');
        return; // Falls die Verbindung fehlgeschlagen ist
      }

      try {
        const states = await adminConnection.getStates('*');
        logdata(`getStates abgeschlossen: ${Object.keys(states).length} States`, 'info');

        const ids = Object.keys(states);
        const jsonContent = JSON.stringify(ids, null, 2);

        await ipcRenderer.invoke('write-file', { filePath, content: jsonContent });
        modalJS.showModal('ioBroker IDs erfolgreich gespeichert.');
        editorJS.resetIoBrokerIDCache();

        await updateButtonAndDisplay();
      }
      catch (error) {
        logdata('Fehler beim Speichern / Abrufen: ' + error, 'error');
      }
    });


    // Initiale Anzeige aktualisieren
    updateButtonAndDisplay();

    actionsContainer.appendChild(button);
    actionsContainer.appendChild(idCountDisplay);

    return actionsContainer;
  },

  saveConfigData(content) {
    const filePath = `./${this.currentFile}`;
    editorJS.saveData(content, filePath);
  },

  renderPages(pages, pagesContainer) {
    pagesContainer.innerHTML = ''; // Bestehende Inhalte löschen

    if (Array.isArray(pages) && pages.length > 0) {
      pages.forEach((page, index) => {
        const pageRow = document.createElement('div');
        pageRow.classList.add('page-row');

        const pageText = document.createElement('span');
        pageText.textContent = page;
        pageRow.appendChild(pageText);

        const upButton = document.createElement('button');
        upButton.textContent = '↑';
        upButton.disabled = index === 0;
        upButton.addEventListener('click', () => {
          this.movePage(index, -1);
        });
        pageRow.appendChild(upButton);

        const downButton = document.createElement('button');
        downButton.textContent = '↓';
        downButton.disabled = index === pages.length - 1;
        downButton.addEventListener('click', () => {
          this.movePage(index, 1);
        });
        pageRow.appendChild(downButton);

        pagesContainer.appendChild(pageRow);
      });
    } else {
      logdata( 'Das Pages-Feld enthält keine gültigen Einträge:'+ pages, 'error');
    }
  },

  movePage(index, direction) {
    const pagesContainer = document.getElementById('pages-container');
    const hiddenInput = document.getElementById('pages-hidden-input');

    const currentPages = JSON.parse(hiddenInput.value); // Hole den aktuellen Array-Wert
    const [movedPage] = currentPages.splice(index, 1);
    currentPages.splice(index + direction, 0, movedPage);

    this.renderPages(currentPages, pagesContainer);
    editorJS.updateHiddenInput(hiddenInput, currentPages); // Aktualisiere das Hidden-Feld
    reloadMenu = true;
  },

  showPageCreationPrompt() {
    return new Promise((resolve) => {
      const promptContainer = document.createElement('div');
      promptContainer.classList.add('prompt-container');

      const promptBox = document.createElement('div');
      promptBox.classList.add('prompt-box');

      promptBox.innerHTML = `
      <h3>Neue Seite hinzufügen</h3>
      <div style="display: flex; align-items: center;">
        <input type="text" id="page-name-input" placeholder="Seitenname eingeben (z.B. 'newPage')" style="flex-grow: 1;"/>
        <span>.json</span>
      </div>
      <div class="prompt-actions">
        <button id="create-page-confirm">Hinzufügen</button>
        <button id="create-page-cancel">Abbrechen</button>
      </div>
    `;

      promptContainer.appendChild(promptBox);
      document.body.appendChild(promptContainer);

      document.getElementById('create-page-cancel').addEventListener('click', () => {
        document.body.removeChild(promptContainer);
        resolve(null); // Abbruch, keine Eingabe
      });

      document.getElementById('create-page-confirm').addEventListener('click', () => {
        const pageNameInput = document.getElementById('page-name-input').value.trim();
        document.body.removeChild(promptContainer);

        if (pageNameInput) {
          resolve(`${pageNameInput}.json`); // Automatisch `.json` hinzufügen
        } else {
          resolve(null); // Keine Eingabe
        }
      });
    });
  },

  addNewPage(pagesContainer, currentPages) {
    this.showPageCreationPrompt().then((newPageName) => {
      const regex = new RegExp(/^[a-zA-Z0-9_-]+\.json$/);
      if (newPageName && regex.test(newPageName)) {
        if (!currentPages.includes(newPageName)) {
          currentPages.push(newPageName); // Füge die neue Seite zur Liste hinzu
          this.renderPages(currentPages, pagesContainer); // Aktualisiere die Anzeige

          const hiddenInput = document.getElementById('pages-hidden-input');
          editorJS.updateHiddenInput(hiddenInput, currentPages); // Aktualisiere das Hidden-Feld
          reloadMenu = true;
        } else {
          modalJS.showModal('Diese Seite existiert bereits.');
        }
      } else {
        modalJS.showModal('Ungültiger Seitenname. Der Name muss dem Muster entsprechen: [a-zA-Z0-9_-]+\\.json');
      }
    });
  },

  showFolderCreationPrompt() {
    return new Promise((resolve) => {
      const promptContainer = document.createElement('div');
      promptContainer.classList.add('prompt-container');

      const promptBox = document.createElement('div');
      promptBox.classList.add('prompt-box');

      promptBox.innerHTML = `
    <h3>Neuen Ordner erstellen</h3>
      <input type="text" id="folder-name-input" placeholder="Ordnername eingeben" />
      <div class="prompt-actions">
        <button id="create-folder-confirm">Erstellen</button>
        <button id="create-folder-cancel">Abbrechen</button>
      </div>
    `;

      promptContainer.appendChild(promptBox);
      document.body.appendChild(promptContainer);

      document.getElementById('create-folder-cancel').addEventListener('click', () => {
        document.body.removeChild(promptContainer);
        resolve(null); // Abbruch, keine Eingabe
      });

      document.getElementById('create-folder-confirm').addEventListener('click', () => {
        const folderName = document.getElementById('folder-name-input').value.trim();
        document.body.removeChild(promptContainer);
        resolve(folderName || null); // Rückgabe des Ordnernamens
      });
    });
  },

  updateDataFolderSelect(selectElement, selectedValue = null) {
    ipcRenderer.invoke('get-root-folders').then((folders) => {
      // Bestehende Optionen entfernen
      while (selectElement.firstChild) {
        selectElement.removeChild(selectElement.firstChild);
      }

      // Feste Optionen hinzufügen
      ['data', 'private'].forEach((folder) => {
        const opt = document.createElement('option');
        opt.value = folder;
        opt.textContent = folder;
        opt.selected = folder === selectedValue;
        selectElement.appendChild(opt);
      });

      // Dynamische Ordner hinzufügen
      folders.forEach((folder) => {
        const opt = document.createElement('option');
        opt.value = folder;
        opt.textContent = folder;
        opt.selected = folder === selectedValue;
        selectElement.appendChild(opt);
      });
    });
  }
};
