const modalJS = {
  showModal(content) {
    const modal = document.querySelector('#dynamic-modal');
    const modalBody = document.querySelector('#modal-body');

    // Inhalt dynamisch einfügen
    modalBody.innerHTML = '';
    if (typeof content === 'string') {
      // Textnachricht
      modalBody.textContent = content;
    } else if (content instanceof HTMLElement) {
      // HTML-Inhalt (z.B. Bild)
      modalBody.appendChild(content);
    }

    modal.classList.remove('hidden'); // Modal anzeigen
  },

  closeModal() {
    const modal = document.querySelector('#dynamic-modal');
    modal.classList.add('hidden'); // Modal ausblenden
  },

  init() {
    // Schließen des Modals beim Klicken auf das X oder den Hintergrund
    document.querySelector('#dynamic-modal').addEventListener('click', (e) => {
      if (e.target.id === 'dynamic-modal' || e.target.classList.contains('close-modal')) {
        this.closeModal();
      }
    });
  },
};

modalJS.init();
