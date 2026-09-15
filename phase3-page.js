(() => {
  'use strict';
  const group = Math.min(5, Math.max(1, Number(document.body.dataset.group || '1')));
  document.title = `Atelier Communication Ambiante - Phase 3 - Groupe ${group}`;
  const root = document.getElementById('phase3-root');
  if (!root) return;

  root.innerHTML = `
    <main class="phase3-shell">
      <div class="phase3-topbar">
        <a class="home-link" href="index.html">← Accueil</a>
        <div class="eyebrow">Atelier Communication Ambiante · Phase 3</div>
      </div>

      <section class="phase3-hero">
        <div class="eyebrow">Atelier Communication Ambiante</div>
        <h1>Phase 3 — Développement approfondi</h1>
        <div class="group-badge">Groupe ${group}</div>
        <p>Pendant <strong>20 minutes</strong>, développez concrètement la modification prioritaire retenue par votre groupe : <strong>ce que vous voulez faire, comment vous voulez le faire et où l’implanter</strong>.</p>
      </section>

      <section class="section-card phase3-selected-card">
        <div class="eyebrow">Modification prioritaire retenue</div>
        <div id="selected-proposal" class="selected-proposal loading">Chargement de la proposition retenue…</div>
      </section>

      <section class="section-card phase3-editor-section">
        <div class="phase3-editor-head">
          <div>
            <h2>Votre proposition détaillée</h2>
            <p class="section-intro">Cet espace est collaboratif : les textes, les images et les dessins sont enregistrés automatiquement et synchronisés avec les autres membres du groupe.</p>
          </div>
          <div class="live-sync-box" aria-live="polite">
            <div class="live-sync-title"><span class="live-dot"></span> Synchronisation en direct</div>
            <span id="save-status" class="save-status">Connexion…</span>
            <span id="presence-status" class="presence-status"></span>
          </div>
        </div>

        <div class="phase3-toolbar" role="toolbar" aria-label="Outils du document">
          <label class="phase3-tool-button image-upload-button">+ Importer une image<input id="image-upload" type="file" accept="image/*" multiple hidden></label>
          <button id="draw-toggle" class="phase3-tool-button" type="button" aria-pressed="false">✎ Dessiner</button>
          <div class="pen-colors" aria-label="Couleurs du stylo">
            <button class="pen-color active" data-color="#d62828" style="--pen:#d62828" type="button" aria-label="Stylo rouge"></button>
            <button class="pen-color" data-color="#1769d1" style="--pen:#1769d1" type="button" aria-label="Stylo bleu"></button>
            <button class="pen-color" data-color="#208b4e" style="--pen:#208b4e" type="button" aria-label="Stylo vert"></button>
            <button class="pen-color" data-color="#e0b51a" style="--pen:#e0b51a" type="button" aria-label="Stylo jaune"></button>
          </div>
          <button id="undo-stroke" class="phase3-tool-button compact" type="button">↶ Annuler trait</button>
          <button id="clear-drawing" class="phase3-tool-button compact danger-lite" type="button">Effacer dessin</button>
        </div>

        <div id="workspace" class="workspace" aria-label="Document de travail collaboratif du groupe">
          <div class="document-text-layer">
            <div id="document-editor" class="document-editor" aria-label="Zone de rédaction collaborative">
              <div class="editor-section" data-section="what">
                <div class="prompt-label">1 · Quoi exactement ?</div>
                <div class="prompt-description">Décrivez précisément ce que vous souhaitez créer, modifier ou installer…</div>
                <div class="answer-space" contenteditable="true" spellcheck="true" aria-label="Réponse à Quoi exactement ?"><br></div>
              </div>
              <div class="editor-section" data-section="how">
                <div class="prompt-label">2 · Comment ?</div>
                <div class="prompt-description">Expliquez le fonctionnement, les matériaux, les étapes, les usages, les personnes impliquées…</div>
                <div class="answer-space" contenteditable="true" spellcheck="true" aria-label="Réponse à Comment ?"><br></div>
              </div>
              <div class="editor-section" data-section="where">
                <div class="prompt-label">3 · Où ?</div>
                <div class="prompt-description">Indiquez l’emplacement précis dans le hall ou dans l’école et expliquez pourquoi…</div>
                <div class="answer-space" contenteditable="true" spellcheck="true" aria-label="Réponse à Où ?"><br></div>
              </div>
            </div>
          </div>
          <div id="image-layer" class="image-layer" aria-label="Images ajoutées"></div>
          <canvas id="drawing-canvas" class="drawing-canvas" aria-label="Calque de dessin collaboratif"></canvas>
        </div>
      </section>

      <a class="home-link phase3-bottom-home" href="index.html">← Retour à la page principale</a>
    </main>`;
})();
