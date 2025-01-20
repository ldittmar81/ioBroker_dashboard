const configJS = {

  movePage(index, direction) {
    const pagesContainer = document.getElementById('pages-container');
    const hiddenInput = document.getElementById('pages-hidden-input');

    const currentPages = JSON.parse(hiddenInput.value); // Hole den aktuellen Array-Wert
    const [movedPage] = currentPages.splice(index, 1);
    currentPages.splice(index + direction, 0, movedPage);

    this.renderPages(currentPages, pagesContainer);
    editorJS.updateHiddenInput(hiddenInput, currentPages); // Aktualisiere das Hidden-Feld
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
      console.error('Das Pages-Feld enthält keine gültigen Einträge:', pages);
    }
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
      if (newPageName) {
        ipcRenderer.invoke('validate-page-name', newPageName).then((isValid) => {
          if (isValid) {
            if (!currentPages.includes(newPageName)) {
              currentPages.push(newPageName); // Füge die neue Seite zur Liste hinzu
              this.renderPages(currentPages, pagesContainer); // Aktualisiere die Anzeige

              const hiddenInput = document.getElementById('pages-hidden-input');
              this.updateHiddenInput(hiddenInput, currentPages); // Aktualisiere das Hidden-Feld
            } else {
              alert('Diese Seite existiert bereits.');
            }
          } else {
            alert('Ungültiger Seitenname. Der Name muss dem Muster entsprechen: [a-zA-Z0-9_-]+\\.json');
          }
        });
      }
    });
  },
  createFormFromSchema(schema, jsonData = {}) {
    editorJS.logdata('Formular wird erstellt...');
    editorJS.showEditor(); // Wechsle zur Editor-Ansicht
    currentSchema = schema;
    editorForm.innerHTML = ''; // Bestehendes Formular löschen

    // Überschrift hinzufügen
    const header = document.createElement('h3');
    header.textContent = `Bearbeite: ${currentFile || 'Neue Konfiguration'}`;
    editorForm.appendChild(header);

    // Durch alle Schema-Eigenschaften iterieren
    Object.keys(schema.properties).forEach((key) => {
      const fieldSchema = schema.properties[key];
      const value = jsonData[key] !== undefined ? jsonData[key] : fieldSchema.default || '';

      // Behandlung spezieller Felder
      if (key === 'pages') {
        const container = editorJS.createFormFieldContainer(fieldSchema, key);

        const pagesContainer = document.createElement('div');
        pagesContainer.id = 'pages-container';
        pagesContainer.classList.add('pages-container');

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'pages-hidden-input';
        hiddenInput.name = key;
        hiddenInput.value = JSON.stringify(value || []); // Initialisiere das Hidden-Feld mit dem Array

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
        const container = editorJS.createFormFieldContainer(fieldSchema, key);

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
                  alert(`Ordner "${newFolder}" wurde erfolgreich erstellt.`);
                  this.updateDataFolderSelect(input, newFolder); // Dropdown aktualisieren und neuen Ordner auswählen
                } else {
                  alert('Fehler beim Erstellen des Ordners.');
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
        const field = editorJS.generateFormField(key, fieldSchema, value);
        if (field) editorForm.appendChild(field);
      }
    });

    // Speichern- und Abbrechen-Buttons
    const actions = document.createElement('div');
    actions.classList.add('actions');
    actions.innerHTML = `
      <button id="save-btn" type="button">Speichern</button>
      <button id="cancel-btn" type="button">Abbrechen</button>
    `;
    editorForm.appendChild(actions);

    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (saveBtn && cancelBtn) {
      saveBtn.addEventListener('click', this.saveFormData);
      cancelBtn.addEventListener('click', () => {
        editorJS.showStartPage();
      });
    }
  },
  saveFormData(event) {
    editorJS.logdata('Speichere Daten...');
    event.preventDefault();

    const updatedContent = {};
    const formData = new FormData(editorForm);

    formData.forEach((value, key) => {
      const fieldSchema = currentSchema.properties[key];

      if (key === 'pages') {
        const hiddenInput = document.getElementById('pages-hidden-input');
        const pages = JSON.parse(hiddenInput.value); // Werte aus dem Hidden-Feld
        if (pages.length > 0) {
          updatedContent[key] = pages;
        }
      } else if (fieldSchema) {
        if (fieldSchema.type === 'boolean') {
          updatedContent[key] = value === 'true';
        } else if (fieldSchema.type === 'array') {
          const arrayValue = value.split('\n').map(item => item.trim()).filter(item => item !== ''); // Filtere leere Einträge
          if (arrayValue.length > 0) {
            updatedContent[key] = arrayValue;
          }
        } else if (value.trim() !== '') {
          updatedContent[key] = value.trim();
        }
      }
    });

    editorJS.logdata(`Speichere aktualisierte Inhalte: ${JSON.stringify(updatedContent, null, 2)}`);
    ipcRenderer.send('save-config', { fileName: currentFile, content: updatedContent });

    editorJS.showStartPage(); // Zurück zur Startseite nach Speichern
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

}
