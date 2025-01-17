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

// Dynamisches Formular aus JSON-Schema erstellen
function createFormFromSchema(schema, jsonData = {}) {
  ipcRenderer.send('log-message', 'Formular wird erstellt...');
  showEditor(); // Wechsle zur Editor-Ansicht
  currentSchema = schema;
  editorForm.innerHTML = ''; // Bestehendes Formular löschen

  // Überschrift hinzufügen
  const header = document.createElement('h3');
  header.textContent = `Bearbeite: ${currentFile}`;
  editorForm.appendChild(header);

  // Durch alle Schema-Eigenschaften iterieren
  Object.keys(schema.properties).forEach((key) => {
    const fieldSchema = schema.properties[key];
    const value = jsonData[key] !== undefined ? jsonData[key] : '';

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

    // Input-Feld
    let input;
    if (key === 'dataFolder') {
      // Selectbox für dataFolder
      input = document.createElement('select');
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

    } else if (fieldSchema.enum) {
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
    if (fieldSchema.type === 'boolean') {
      updatedContent[key] = value === 'true';
    } else if (fieldSchema.type === 'array') {
      updatedContent[key] = value.split('\n').map((item) => item.trim());
    } else {
      updatedContent[key] = value;
    }
  });

  ipcRenderer.send('save-config', { fileName: currentFile, content: updatedContent });
  showStartPage(); // Zurück zur Startseite nach Speichern
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
