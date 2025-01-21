const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Nachrichten vom Renderer-Prozess an den Main-Prozess senden
  send: (channel, data) => {
    const validChannels = ['save-config', 'log-message', 'edit-user', 'new-user', 'open-section'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Nachrichten vom Main-Prozess im Renderer-Prozess empfangen
  on: (channel, func) => {
    const validChannels = ['load-config', 'log-message', 'edit-user', 'new-user', 'open-section'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // IPC-Aufrufe, die Promises zurückgeben
  invoke: (channel, data) => {
    const validChannels = [
      'get-root-folders',
      'create-folder',
      'validate-page-name',
      'save-user',
      'upload-icon',
      'get-schema',
      'load-config',
      'check-file-existence'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Ungültiger Kanal: ${channel}`));
  },
});
