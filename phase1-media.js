(() => {
  'use strict';

  function addTimedHeading(section, text) {
    if (!section) return;
    const oldWrapper = section.querySelector(':scope > .phase1-step-heading');
    if (oldWrapper) {
      const h2 = oldWrapper.querySelector('h2');
      if (h2) h2.textContent = text;
      return;
    }
    const h2 = section.querySelector(':scope > h2');
    if (!h2) return;
    h2.textContent = text;

    const wrapper = document.createElement('div');
    wrapper.className = 'phase1-step-heading';
    const pill = document.createElement('span');
    pill.className = 'time-pill';
    pill.textContent = '≈ 10 min';

    h2.parentNode.insertBefore(wrapper, h2);
    wrapper.appendChild(h2);
    wrapper.appendChild(pill);
  }

  function applyPhase1MediaPatch() {
    const sections = [...document.querySelectorAll('.section-card')];

    const deroule = sections.find(section =>
      section.querySelector('h2')?.textContent?.trim() === 'Déroulé de la Phase 1'
    );

    if (deroule) {
      const intro = deroule.querySelector('.section-intro');
      if (intro && intro.textContent.includes('Environ 30 minutes')) intro.remove();

      const timelineTitles = deroule.querySelectorAll('.timeline-step h3');
      const labels = [
        'Étape 1 : brainstorming individuel',
        'Étape 2 : lecture et prise de recul',
        'Étape 3 : sélection collective'
      ];
      timelineTitles.forEach((title, index) => {
        if (labels[index]) title.textContent = labels[index];
      });
    }

    const brainstorming = document.querySelector('#brainstorming');
    const brainstormingIntro = brainstorming?.querySelector('.section-intro');
    if (brainstormingIntro) {
      brainstormingIntro.textContent =
        'Le chat de votre groupe est collaboratif et se met à jour en direct. Utilisez les boutons ci-dessous pour consulter les autres groupes en lecture seule.';
    }

    document.querySelector('#chat-counter')?.remove();
    brainstorming?.querySelector('.chat-foot')?.remove();
    brainstorming?.querySelector('.privacy-note')?.remove();

    document.querySelector('#example-fresque')?.remove();

    document.querySelector('#hall-photos')?.remove();
    if (deroule) {
      deroule.insertAdjacentHTML('afterend', `
        <section class="section-card" id="hall-photos">
          <h2>Photos originales du hall</h2>
          <p class="section-intro">Quatre vues larges du hall pour garder une vision concrète de l’espace pendant la réflexion.</p>
          <div class="hall-gallery">
            <figure><img src="hall-original-1.jpg" alt="Vue large originale du hall côté assises et rampe"><figcaption>Vue 1</figcaption></figure>
            <figure><img src="hall-original-2.jpg" alt="Vue large originale du hall côté circulation principale"><figcaption>Vue 2</figcaption></figure>
            <figure><img src="hall-original-3.jpg" alt="Vue large originale du hall sous la mezzanine"><figcaption>Vue 3</figcaption></figure>
            <figure><img src="hall-original-4.jpg" alt="Vue large originale complémentaire du hall"><figcaption>Vue 4</figcaption></figure>
          </div>
        </section>
      `);
    }

    addTimedHeading(brainstorming, 'Étape 1 : brainstorming individuel');

    document.querySelector('#phase1-step-2')?.remove();
    const selection = document.querySelector('#selection');

    if (brainstorming && selection) {
      const step2 = document.createElement('section');
      step2.className = 'section-card phase1-reading-card';
      step2.id = 'phase1-step-2';
      step2.innerHTML = `
        <div class="phase1-step-heading">
          <h2>Étape 2 : lecture et prise de recul</h2>
          <span class="time-pill">≈ 10 min</span>
        </div>
      `;
      selection.parentNode.insertBefore(step2, selection);
    }

    addTimedHeading(selection, 'Étape 3 : sélection collective');

    const bottomLinks = [...document.querySelectorAll('.phase1-shell > .home-link')];
    const finalLink = bottomLinks.at(-1);
    if (finalLink) {
      finalLink.textContent = '← Retour à la page principale pour accéder à la Phase 2';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPhase1MediaPatch, { once: true });
  } else {
    applyPhase1MediaPatch();
  }
})();
