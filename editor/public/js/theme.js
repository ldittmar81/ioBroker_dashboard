const themeJS = {
  checkAndCopyDefaultTheme() {
    logdata('info', 'Drin...');
    const defaultThemePath = `${currentDataFolder}/theme/default.css`;
    const assetsThemePath = 'assets/css/users/default.css';
    logdata('info', defaultThemePath);
    ipcRenderer.invoke('check-file-existence', { files: [{ path: defaultThemePath }] })
      .then((results) => {
        const exists = results[0]?.exists;

        if (!exists) {
          logdata('info', 'default.css existiert nicht. Kopiere default.css...');
          // Datei kopieren
          ipcRenderer.invoke('copy-file', { source: assetsThemePath, destination: defaultThemePath })
            .then(() => {
              logdata('info',`default.css wurde erfolgreich von "${assetsThemePath}" nach "${defaultThemePath}" kopiert.`);
              this.loadTheme(defaultThemePath);
            })
            .catch((error) => {
              logdata('error','Fehler beim Kopieren der default.css:', error);
            });
        } else {
          logdata('info', 'default.css existiert bereits.');
          this.loadTheme(defaultThemePath);
        }
      })
      .catch((error) => {
        logdata('error','Fehler beim Überprüfen von default.css:', error);
      });
  },
  loadTheme(themePath) {
    ipcRenderer.send('load-theme', themePath);
  }
};

