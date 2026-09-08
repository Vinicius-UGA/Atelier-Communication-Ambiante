(() => {
  'use strict';

  const group = Math.min(5, Math.max(1, Number(document.body.dataset.group || '1')));
  document.title = `Atelier Communication Ambiante - Phase 2 - Groupe ${group}`;
  const root = document.getElementById('phase2-root');
  if (!root) return;

  root.innerHTML = `
    <main class="phase2-shell">
      <div class="phase2-topbar">
        <a class="home-link" href="index.html">← Accueil</a>
        <div class="eyebrow">Atelier Communication Ambiante · Phase 2</div>
      </div>

      <section class="phase2-hero">
        <div class="eyebrow">Atelier Communication Ambiante</div>
        <h1>Phase 2 — Présentation & choix</h1>
        <div class="group-badge">Groupe ${group}</div>
        <p>Les 25 modifications prioritaires issues de la Phase 1 sont réunies ci-dessous. Après leur présentation et leur défense par les représentants des cinq groupes, votre groupe doit retenir <strong>une seule modification prioritaire</strong>.</p>
      </section>

      <section class="section-card">
        <h2>Les 25 modifications prioritaires</h2>
        <p class="section-intro">Les propositions sont classées par groupe d’origine. Une même modification ne peut être retenue que par un seul groupe : dès qu’elle est choisie, elle devient indisponible pour les autres groupes.</p>
        <div id="phase2-status" class="phase2-status">Connexion à l’archive permanente…</div>
        <div id="all-proposals" class="phase2-groups" aria-live="polite"></div>
      </section>

      <section class="section-card phase2-choice-card" id="current-choice-section">
        <div class="choice-heading">
          <div>
            <div class="eyebrow">Choix du Groupe ${group}</div>
            <h2>Modification prioritaire retenue</h2>
          </div>
          <button id="clear-choice" class="secondary-button" type="button" hidden>Annuler le choix</button>
        </div>
        <div id="current-choice" class="current-choice empty">Aucune modification sélectionnée pour le moment.</div>
        <p id="choice-feedback" class="choice-feedback" aria-live="polite"></p>
      </section>

      <a class="home-link phase2-bottom-home" href="index.html">← Retour à la page principale</a>
    </main>`;
})();
