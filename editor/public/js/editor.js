const ipcRenderer = window.electronAPI;

const editorForm = document.querySelector('#editor-form');
const startPage = document.querySelector('#start-page');
const editorContainer = document.querySelector('#editor-container');

let currentSchema = null;
let currentFile = null;
let currentContent = null;

const editorJS = {
  showStartPage() {
    startPage.classList.remove('hidden');
    editorContainer.classList.add('hidden');
  },
  showEditor() {
    startPage.classList.add('hidden');
    editorContainer.classList.remove('hidden');
  },
  updateHiddenInput(hiddenInput, pagesArray) {
    hiddenInput.value = JSON.stringify(pagesArray);
  },
}

ipcRenderer.on('load-config', ({ fileName, schema, content }) => {
  currentFile = fileName;
  currentContent = content;
  configJS.createFormFromSchema(schema, content);
});

ipcRenderer.on('new-user', () => {
  usersJS.showUserForm(); // Leeres Formular anzeigen
});

ipcRenderer.on('edit-user', (user) => {
  usersJS.showUserForm(user); // Formular mit Benutzerinformationen anzeigen
});


// Zeige Startseite beim Start
editorJS.showStartPage();
