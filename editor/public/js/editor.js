const ipcRenderer = window.electronAPI;

const editorForm = document.querySelector('#editor-form');
let currentSchema = null;
let currentFile = null;
let currentContent = null;

// Dynamisches Formular aus JSON-Schema erstellen
function createFormFromSchema(schema, jsonData = {}) {
  ipcRenderer.send('log-message', 'Formular wird erstellt...');
  currentSchema = schema;
  editorForm.innerHTML = ''; // Bestehendes Formular löschen

  // Überschrift hinzufügen
  const header = document.createElement('h3');
  header.textContent = `Bearbeite: ${currentFile}`;
  editorForm.appendChild(header);

  // Durch alle Schema-Eigenschaften iterieren
  Object.keys(schema.properties).forEach((key) => {
    const fieldSchema = schema.properties[key];
    const value = jsonData[key] || '';

    const container = document.createElement('div');
    container.classList.add('form-field');

    // Label
    const label = document.createElement('label');
    label.textContent = fieldSchema.description || key;
    label.htmlFor = key;
    container.appendChild(label);

    // Input-Feld
    let input;
    if (fieldSchema.type === 'boolean') {
      input = document.createElement('select');
      input.innerHTML = `
        <option value="true" ${value === true ? 'selected' : ''}>Ja</option>
        <option value="false" ${value === false ? 'selected' : ''}>Nein</option>`;
    } else if (fieldSchema.type === 'array') {
      input = document.createElement('textarea');
      input.value = value.join('\n');
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value;
    }

    input.id = key;
    input.name = key;
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
  console.log('Buttons hinzufügen...');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  if (saveBtn && cancelBtn) {
    saveBtn.addEventListener('click', saveFormData);
    cancelBtn.addEventListener('click', () =>
      createFormFromSchema(currentSchema, currentContent)
    );
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

  ipcRenderer.send('log-message', 'Daten verarbeitet:' + JSON.stringify(updatedContent));
  ipcRenderer.send('save-config', { fileName: currentFile, content: updatedContent });
}

// Konfiguration laden
ipcRenderer.on('load-config', ({ fileName, schema, content }) => {
  currentFile = fileName;
  currentContent = content;
  createFormFromSchema(schema, content);
});
