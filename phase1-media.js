(() => {
  'use strict';

  function applyPhase1MediaPatch() {
    document.querySelectorAll('.section-card').forEach((section) => {
      const title = section.querySelector('h2')?.textContent?.trim() || '';
      if (title === 'Déroulé de la Phase 1') {
        const intro = section.querySelector('.section-intro');
        if (intro && intro.textContent.includes('Environ 30 minutes')) intro.remove();
      }
    });

    const brainstormingIntro = document.querySelector('#brainstorming .section-intro');
    if (brainstormingIntro) {
      brainstormingIntro.textContent = 'Le chat de votre groupe est collaboratif et se met à jour en direct. Utilisez les boutons ci-dessous pour consulter les autres groupes en lecture seule.';
    }

    document.querySelector('#chat-counter')?.remove();

    const selection = document.querySelector('#selection');
    if (!selection || document.querySelector('#hall-photos')) return;

    selection.insertAdjacentHTML('afterend', `
      <section class="section-card" id="hall-photos">
        <h2>Photos originales du hall</h2>
        <p class="section-intro">Quatre vues larges du hall pour garder une vision concrète de l’espace pendant la réflexion.</p>
        <div class="hall-gallery">
          <figure><div class="hall-photo hall-photo-1" role="img" aria-label="Vue large originale du hall côté assises et rampe"></div><figcaption>Vue 1</figcaption></figure>
          <figure><div class="hall-photo hall-photo-2" role="img" aria-label="Vue large originale du hall côté circulation principale"></div><figcaption>Vue 2</figcaption></figure>
          <figure><div class="hall-photo hall-photo-3" role="img" aria-label="Vue large originale du hall sous la mezzanine"></div><figcaption>Vue 3</figcaption></figure>
          <figure><div class="hall-photo hall-photo-4" role="img" aria-label="Vue large originale complémentaire du hall"></div><figcaption>Vue 4</figcaption></figure>
        </div>
      </section>

      <section class="section-card example-idea" id="example-fresque">
        <h2>Exemple d’idée : fresque dans le mur du hall</h2>
        <p class="section-intro">Exemple visuel pour illustrer comment une intervention graphique à dominante bleue peut participer à la communication ambiante du hall.</p>
        <img class="example-idea-image" src="assets/exemple-fresque-bleue.webp" alt="Exemple visuel généré d'une intervention graphique bleue dans le hall">
      </section>
    `);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPhase1MediaPatch, { once: true });
  } else {
    applyPhase1MediaPatch();
  }
})();
