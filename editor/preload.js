const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  // Nachrichten vom Renderer-Prozess an den Main-Prozess senden
  send: (channel, data) => {
    const validChannels = ['save-config', 'log-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Nachrichten vom Main-Prozess im Renderer-Prozess empfangen
  on: (channel, func) => {
    const validChannels = [
      'load-config',
      'edit-user',
      'new-user',
      'open-section',
      'edit-theme',
      'edit-sidebar',
      'edit-overview',
      'edit-page'];
    if (validChannels.includes(channel)) {
      console.log(`Listening for channel: ${channel}`);
      ipcRenderer.on(channel, (event, ...args) => {
        console.log(`Message received on channel ${channel}:`, args);
        func(...args);
      });
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
      'check-file-existence',
      'copy-file'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Ungültiger Kanal: ${channel}`));
  },
});
