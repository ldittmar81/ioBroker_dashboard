const ipcRenderer = window.electronAPI;

const editorForm = document.querySelector('#editor-form');
const startPage = document.querySelector('#start-page');
const editorContainer = document.querySelector('#editor-container');

let currentSchema = null;
let currentFile = null;
let currentContent = null;

// Zeige die Startseite
function showStartPage() {
  startPage.classList.remove('hidden');
  editorContainer.classList.add('hidden');
}

// Zeige den Editor
function showEditor() {
  startPage.classList.add('hidden');
  editorContainer.classList.remove('hidden');
}

function movePage(index, direction) {
  const pagesContainer = document.getElementById('pages-container');
  const hiddenInput = document.getElementById('pages-hidden-input');

  const currentPages = JSON.parse(hiddenInput.value); // Hole den aktuellen Array-Wert
  const [movedPage] = currentPages.splice(index, 1);
  currentPages.splice(index + direction, 0, movedPage);

  renderPages(currentPages, pagesContainer);
  updateHiddenInput(hiddenInput, currentPages); // Aktualisiere das Hidden-Feld
}

function renderPages(pages, pagesContainer) {
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
        movePage(index, -1);
      });
      pageRow.appendChild(upButton);

      const downButton = document.createElement('button');
      downButton.textContent = '↓';
      downButton.disabled = index === pages.length - 1;
      downButton.addEventListener('click', () => {
        movePage(index, 1);
      });
      pageRow.appendChild(downButton);

      pagesContainer.appendChild(pageRow);
    });
  } else {
    console.error('Das Pages-Feld enthält keine gültigen Einträge:', pages);
  }
}

function showPageCreationPrompt() {
  return new Promise((resolve) => {
    const promptContainer = document.createElement('div');
    promptContainer.classList.add('prompt-container');

    const promptBox = document.createElement('div');
    promptBox.classList.add('prompt-box');

    promptBox.innerHTML = `
      <h3>Neue Seite hinzufügen</h3>
      <input type="text" id="page-name-input" placeholder="Seitenname eingeben (z.B. 'newPage.json')" />
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
      const pageName = document.getElementById('page-name-input').value.trim();
      document.body.removeChild(promptContainer);
      resolve(pageName || null); // Rückgabe des Seitennamens
    });
  });
}

function addNewPage(pagesContainer, currentPages) {
  showPageCreationPrompt().then((newPageName) => {
    if (newPageName) {
      ipcRenderer.invoke('validate-page-name', newPageName).then((isValid) => {
        if (isValid) {
          if (!currentPages.includes(newPageName)) {
            currentPages.push(newPageName); // Füge die neue Seite zur Liste hinzu
            renderPages(currentPages, pagesContainer); // Aktualisiere die Anzeige

            const hiddenInput = document.getElementById('pages-hidden-input');
            updateHiddenInput(hiddenInput, currentPages); // Aktualisiere das Hidden-Feld
          } else {
            alert('Diese Seite existiert bereits.');
          }
        } else {
          alert('Ungültiger Seitenname. Der Name muss dem Muster entsprechen: [a-zA-Z0-9_-]+\\.json');
        }
      });
    }
  });
}

function updateHiddenInput(hiddenInput, pagesArray) {
  hiddenInput.value = JSON.stringify(pagesArray);
}


// Dynamisches Formular aus JSON-Schema erstellen
function createFormFromSchema(schema, jsonData = {}) {
  ipcRenderer.send('log-message', 'Formular wird erstellt...');
  showEditor(); // Wechsle zur Editor-Ansicht
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

    const container = document.createElement('div');
    container.classList.add('form-field');

    // Label
    const label = document.createElement('label');
    label.textContent = fieldSchema.description || key;
    label.htmlFor = key;

    // Rotes Sternchen für required-Felder
    if (schema.required && schema.required.includes(key)) {
      const requiredSpan = document.createElement('span');
      requiredSpan.textContent = ' *';
      requiredSpan.style.color = 'red';
      label.appendChild(requiredSpan);
    }

    container.appendChild(label);

    // Behandlung spezieller Felder
    if (key === 'pages') {
      const pagesContainer = document.createElement('div');
      pagesContainer.id = 'pages-container';
      pagesContainer.classList.add('pages-container');

      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'pages-hidden-input';
      hiddenInput.name = key;
      hiddenInput.value = JSON.stringify(value || []); // Initialisiere das Hidden-Feld mit dem Array

      const currentPages = Array.isArray(value) ? [...value] : []; // Kopie des Arrays
      renderPages(currentPages, pagesContainer);

      const addPageButton = document.createElement('button');
      addPageButton.textContent = 'Neue Seite hinzufügen';
      addPageButton.type = 'button';
      addPageButton.addEventListener('click', () => {
        addNewPage(pagesContainer, currentPages);
        updateHiddenInput(hiddenInput, currentPages);
      });

      container.appendChild(pagesContainer);
      container.appendChild(addPageButton);
      container.appendChild(hiddenInput); // Hidden-Feld hinzufügen
    }

    else {
      // Andere Eingabetypen
      let input;

      if (key === 'dataFolder') {
        // Selectbox für dataFolder
        input = document.createElement('select');

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
          showFolderCreationPrompt().then((newFolder) => {
            if (newFolder) {
              ipcRenderer.invoke('create-folder', newFolder).then((success) => {
                if (success) {
                  alert(`Ordner "${newFolder}" wurde erfolgreich erstellt.`);
                  updateDataFolderSelect(input, newFolder); // Dropdown aktualisieren und neuen Ordner auswählen
                } else {
                  alert('Fehler beim Erstellen des Ordners.');
                }
              });
            }
          });
        });

        container.appendChild(input);
        container.appendChild(createFolderButton);
      }
         else if (fieldSchema.enum) {
        // Dropdown für enum-Werte
        input = document.createElement('select');
        fieldSchema.enum.forEach((option) => {
          const opt = document.createElement('option');
          opt.value = option;
          opt.textContent = option;
          opt.selected = option === value;
          input.appendChild(opt);
        });
      } else if (fieldSchema.type === 'boolean') {
        // Dropdown für boolean
        input = document.createElement('select');
        input.innerHTML = `
          <option value="true" ${value === true || value === 'true' ? 'selected' : ''}>Ja</option>
          <option value="false" ${value === false || value === 'false' ? 'selected' : ''}>Nein</option>`;
      } else if (fieldSchema.type === 'array') {
        input = document.createElement('textarea');
        input.value = Array.isArray(value) ? value.join('\n') : '';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
      }

      input.id = key;
      input.name = key;

      // Validierung mit pattern
      if (fieldSchema.pattern) {
        input.pattern = fieldSchema.pattern;
        const patternInfo = document.createElement('small');
        patternInfo.textContent = `Muss Muster entsprechen: ${fieldSchema.pattern}`;
        patternInfo.style.display = 'block';
        patternInfo.style.color = 'gray';
        container.appendChild(patternInfo);
      }

      container.appendChild(input);
    }

    editorForm.appendChild(container);
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
    saveBtn.addEventListener('click', saveFormData);
    cancelBtn.addEventListener('click', () => {
      showStartPage();
    });
  }
}

// Formulardaten speichern
function saveFormData(event) {
  ipcRenderer.send('log-message', 'Speichere Daten...');
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

  ipcRenderer.send('log-message', `Speichere aktualisierte Inhalte: ${JSON.stringify(updatedContent, null, 2)}`);
  ipcRenderer.send('save-config', { fileName: currentFile, content: updatedContent });

  showStartPage(); // Zurück zur Startseite nach Speichern
}

function showFolderCreationPrompt() {
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
}

function updateDataFolderSelect(selectElement, selectedValue = null) {
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


// Konfiguration laden
ipcRenderer.on('load-config', ({ fileName, schema, content }) => {
  currentFile = fileName;
  currentContent = content;
  createFormFromSchema(schema, content);
});

// Zeige Startseite beim Start
showStartPage();
