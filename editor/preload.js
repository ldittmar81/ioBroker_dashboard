const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = ['save-config', 'log-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    const validChannels = [
      'load-config',
      'edit-user',
      'new-user',
      'open-section',
      'edit-theme',
      'edit-sidebar',
      'edit-overview',
      'edit-page',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  invoke: (channel, data) => {
    const validChannels = [
      'get-root-folders',
      'create-folder',
      'validate-page-name',
      'save-user',
      'upload-icon',
      'get-schema',
      'check-file-existence',
      'copy-file',
      'read-file',
      'write-file',
      'get-icon-path',
      'list-subfolders'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Ungültiger Kanal: ${channel}`));
  }
});
