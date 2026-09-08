(() => {
  'use strict';

  const desiredBrainstormingText = 'Le chat de votre groupe est collaboratif et se met à jour en direct. Utilisez les boutons ci-dessous pour consulter les autres groupes en lecture seule.';

  function cleanTextAndChatNotices() {
    // Retire le texte général sur les 30 minutes.
    document.querySelectorAll('.section-card').forEach((section) => {
      const title = section.querySelector('h2')?.textContent?.trim() || '';
      if (title === 'Déroulé de la Phase 1') {
        const intro = section.querySelector('.section-intro');
        if (intro && intro.textContent.includes('Environ 30 minutes')) intro.remove();
      }
    });

    // Le chat reste collaboratif sans afficher les mentions
    // « Messages anonymes… », « …à tout moment » ni la limite de 1000 messages.
    const brainstormingIntro = document.querySelector('#brainstorming .section-intro');
    if (brainstormingIntro && brainstormingIntro.textContent !== desiredBrainstormingText) {
      brainstormingIntro.textContent = desiredBrainstormingText;
    }

    document.querySelector('#chat-counter')?.remove();
    document.querySelector('#brainstorming .chat-foot')?.remove();
    document.querySelector('#brainstorming .privacy-note')?.remove();
  }

  function installHallPhotosAndExample() {
    const selection = document.querySelector('#selection');
    if (!selection) return;

    // Supprime toute ancienne version (sprite/compressée) avant d'ajouter les originaux.
    document.querySelector('#hall-photos')?.remove();
    document.querySelector('#example-fresque')?.remove();

    selection.insertAdjacentHTML('afterend', `
      <section class="section-card" id="hall-photos">
        <h2>Photos originales du hall</h2>
        <p class="section-intro">Quatre vues larges du hall pour garder une vision concrète de l’espace pendant la réflexion.</p>
        <div class="hall-gallery">
          <figure>
            <a href="assets/hall-original-1.jpg" target="_blank" rel="noopener">
              <img src="assets/hall-original-1.jpg" alt="Vue large originale du hall côté assises et rampe" decoding="async">
            </a>
            <figcaption>Vue 1</figcaption>
          </figure>
          <figure>
            <a href="assets/hall-original-2.jpg" target="_blank" rel="noopener">
              <img src="assets/hall-original-2.jpg" alt="Vue large originale du hall côté circulation principale" decoding="async">
            </a>
            <figcaption>Vue 2</figcaption>
          </figure>
          <figure>
            <a href="assets/hall-original-3.jpg" target="_blank" rel="noopener">
              <img src="assets/hall-original-3.jpg" alt="Vue large originale du hall sous la mezzanine" decoding="async">
            </a>
            <figcaption>Vue 3</figcaption>
          </figure>
          <figure>
            <a href="assets/hall-original-4.jpg" target="_blank" rel="noopener">
              <img src="assets/hall-original-4.jpg" alt="Vue large originale complémentaire du hall" decoding="async">
            </a>
            <figcaption>Vue 4</figcaption>
          </figure>
        </div>
      </section>

      <section class="section-card example-idea" id="example-fresque">
        <h2>Exemple d’idée : fresque dans le mur du hall</h2>
        <p class="section-intro">Exemple visuel pour illustrer comment une intervention graphique à dominante bleue peut participer à la communication ambiante du hall.</p>
        <img class="example-idea-image" src="assets/exemple-fresque.png" alt="Exemple de fresque bleue dans le hall">
      </section>
    `);
  }

  function applyPatch() {
    cleanTextAndChatNotices();
    installHallPhotosAndExample();

    // Sécurité : si phase1.js modifie ensuite le texte du chat,
    // on retire à nouveau ces mentions sans toucher au fonctionnement Firebase.
    const brainstorming = document.querySelector('#brainstorming');
    if (brainstorming) {
      const observer = new MutationObserver(() => cleanTextAndChatNotices());
      observer.observe(brainstorming, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPatch, { once: true });
  } else {
    applyPatch();
  }
})();
