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

  Object.keys(schema.properties).forEach((key) => {
    const fieldSchema = schema.properties[key];
    const value = jsonData[key] !== undefined ? jsonData[key] : '';

    const container = document.createElement('div');
    container.classList.add('form-field');

    // Label
    const label = document.createElement('label');
    label.textContent = fieldSchema.description || key;
    label.htmlFor = key;

    if (schema.required && schema.required.includes(key)) {
      const requiredSpan = document.createElement('span');
      requiredSpan.textContent = ' *';
      requiredSpan.style.color = 'red';
      label.appendChild(requiredSpan);
    }

    container.appendChild(label);

    // Input-Feld
    let input;
    if (fieldSchema.enum) {
      input = document.createElement('select');
      fieldSchema.enum.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        opt.selected = option === value;
        input.appendChild(opt);
      });
    } else if (fieldSchema.type === 'boolean') {
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

  ipcRenderer.send('log-message', 'Buttons hinzufügen...');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  if (saveBtn && cancelBtn) {
    saveBtn.addEventListener('click', saveFormData);
    cancelBtn.addEventListener('click', () => {
      ipcRenderer.send('log-message', 'Bearbeitung abgebrochen.');
      showStartPage();
    });
  } else {
    ipcRenderer.send('log-message', 'Buttons nicht gefunden...');
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

// Konfiguration laden
ipcRenderer.on('load-config', ({ fileName, schema, content }) => {
  currentFile = fileName;
  currentContent = content;
  createFormFromSchema(schema, content);
});

// Zeige Startseite beim Start
showStartPage();
