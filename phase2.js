(async () => {
  'use strict';

  const currentGroup = Math.min(5, Math.max(1, Number(document.body.dataset.group || '1')));
  const $ = (sel) => document.querySelector(sel);
  const allProposalsEl = $('#all-proposals');
  const statusEl = $('#phase2-status');
  const currentChoiceEl = $('#current-choice');
  const feedbackEl = $('#choice-feedback');
  const clearButton = $('#clear-choice');

  let proposals = {};
  let selections = {};
  let dbSdk = null;
  let db = null;

  const proposalId = (sourceGroup, slot) => `g${sourceGroup}-p${slot}`;
  const groupKey = (group) => `groupe${group}`;

  function setStatus(text, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `phase2-status ${kind}`.trim();
  }

  function setFeedback(text, kind = '') {
    if (!feedbackEl) return;
    feedbackEl.textContent = text;
    feedbackEl.className = `choice-feedback ${kind}`.trim();
  }

  function proposalText(id) {
    const item = proposals[id];
    return item?.text?.trim() || '';
  }

  function selectedBy(id) {
    for (let group = 1; group <= 5; group += 1) {
      if (selections[groupKey(group)]?.proposalId === id) return group;
    }
    return null;
  }

  function render() {
    if (!allProposalsEl) return;
    allProposalsEl.innerHTML = '';

    for (let sourceGroup = 1; sourceGroup <= 5; sourceGroup += 1) {
      const block = document.createElement('section');
      block.className = 'phase2-group-block';
      block.innerHTML = `<div class="phase2-group-title"><h3>Groupe ${sourceGroup}</h3></div>`;

      const list = document.createElement('div');
      list.className = 'phase2-proposals';

      for (let slot = 1; slot <= 5; slot += 1) {
        const id = proposalId(sourceGroup, slot);
        const text = proposalText(id);
        const ownerGroup = selectedBy(id);
        const mine = ownerGroup === currentGroup;
        const taken = ownerGroup && ownerGroup !== currentGroup;

        const row = document.createElement('article');
        row.className = `phase2-proposal${mine ? ' selected-by-me' : ''}${taken ? ' selected-by-other' : ''}${!text ? ' empty' : ''}`;

        const number = document.createElement('div');
        number.className = 'proposal-number';
        number.textContent = slot;

        const copy = document.createElement('div');
        copy.className = 'proposal-copy';
        const p = document.createElement('p');
        p.textContent = text || 'Non renseignée';
        copy.appendChild(p);

        const state = document.createElement('div');
        state.className = `proposal-state${mine ? ' mine' : ''}${taken ? ' taken' : ''}`;
        if (mine) state.textContent = `Choix actuel du Groupe ${currentGroup}`;
        else if (taken) state.textContent = `Déjà retenue par le Groupe ${ownerGroup}`;
        else if (!text) state.textContent = 'Aucune proposition enregistrée dans ce champ.';
        else state.textContent = `Modification ${slot} du Groupe ${sourceGroup}`;
        copy.appendChild(state);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choose-button';
        button.textContent = mine ? 'Choisie' : 'Choisir';
        button.disabled = !text || Boolean(taken) || mine;
        button.addEventListener('click', () => chooseProposal(id, sourceGroup, slot));

        row.append(number, copy, button);
        list.appendChild(row);
      }

      block.appendChild(list);
      allProposalsEl.appendChild(block);
    }

    const myChoice = selections[groupKey(currentGroup)] || null;
    if (!myChoice?.proposalId) {
      currentChoiceEl.className = 'current-choice empty';
      currentChoiceEl.textContent = 'Aucune modification sélectionnée pour le moment.';
      clearButton.hidden = true;
    } else {
      const text = proposalText(myChoice.proposalId) || 'La proposition sélectionnée n’est plus renseignée dans la Phase 1.';
      currentChoiceEl.className = 'current-choice';
      currentChoiceEl.innerHTML = '';
      const source = document.createElement('span');
      source.className = 'choice-source';
      source.textContent = `Proposition du Groupe ${myChoice.sourceGroup} · Modification ${myChoice.slot}`;
      const content = document.createElement('div');
      content.textContent = text;
      currentChoiceEl.append(source, content);
      clearButton.hidden = false;
    }
  }

  async function chooseProposal(id, sourceGroup, slot) {
    if (!dbSdk || !db) return;
    const text = proposalText(id);
    if (!text) return;

    setFeedback('Enregistrement du choix…');
    const selectionsRef = dbSdk.ref(db, 'atelier/phase2/choix');
    try {
      const result = await dbSdk.runTransaction(selectionsRef, (current) => {
        const next = current && typeof current === 'object' ? { ...current } : {};

        for (let group = 1; group <= 5; group += 1) {
          const key = groupKey(group);
          if (group !== currentGroup && next[key]?.proposalId === id) {
            return; // transaction annulée : proposition déjà prise
          }
        }

        next[groupKey(currentGroup)] = { proposalId: id, sourceGroup, slot };
        return next;
      });

      if (!result.committed) {
        setFeedback('Cette modification vient d’être choisie par un autre groupe. Sélectionnez-en une autre.', 'error');
      } else {
        setFeedback('Choix enregistré dans l’archive permanente.', 'ok');
      }
    } catch (error) {
      console.error(error);
      setFeedback('Impossible d’enregistrer le choix. Réessayez.', 'error');
    }
  }

  async function clearChoice() {
    if (!dbSdk || !db) return;
    setFeedback('Suppression du choix…');
    try {
      await dbSdk.runTransaction(dbSdk.ref(db, 'atelier/phase2/choix'), (current) => {
        if (!current || typeof current !== 'object') return current;
        const next = { ...current };
        delete next[groupKey(currentGroup)];
        return next;
      });
      setFeedback('Choix annulé. Vous pouvez sélectionner une autre modification.', 'ok');
    } catch (error) {
      console.error(error);
      setFeedback('Impossible d’annuler le choix. Réessayez.', 'error');
    }
  }

  clearButton?.addEventListener('click', clearChoice);

  function showDatabaseError(error) {
    console.error(error);
    const code = String(error?.code || '');
    if (code.includes('permission-denied')) setStatus('Accès refusé par Firebase : vérifiez les règles de la base.', 'error');
    else if (code.includes('auth/operation-not-allowed')) setStatus('Activez l’authentification anonyme dans Firebase.', 'error');
    else setStatus('Connexion Firebase impossible. Réessayez.', 'error');
  }

  try {
    const [appSdk, authSdk, databaseSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js')
    ]);

    dbSdk = databaseSdk;

    const firebaseConfig = {
      apiKey: 'AIzaSyCVZqGFfnwb8iesFizm2escpgYVoIQI6Fc',
      authDomain: 'atelier-communication-ambiante.firebaseapp.com',
      databaseURL: 'https://atelier-communication-ambiante-default-rtdb.europe-west1.firebasedatabase.app',
      projectId: 'atelier-communication-ambiante',
      storageBucket: 'atelier-communication-ambiante.firebasestorage.app',
      messagingSenderId: '43940720482',
      appId: '1:43940720482:web:c5e6e8776d7f399caf463b'
    };

    const app = appSdk.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    await authSdk.signInAnonymously(auth);
    db = dbSdk.getDatabase(app);

    // Récupère en direct les 25 modifications de la Phase 1.
    for (let group = 1; group <= 5; group += 1) {
      dbSdk.onValue(dbSdk.ref(db, `atelier/phase1/groupe${group}/propositions`), (snapshot) => {
        for (let slot = 1; slot <= 5; slot += 1) {
          const value = snapshot.child(String(slot)).val();
          proposals[proposalId(group, slot)] = {
            sourceGroup: group,
            slot,
            text: typeof value === 'string' ? value : ''
          };
        }
        render();
      }, showDatabaseError);
    }

    // Récupère les choix des cinq groupes et les met à jour en temps réel.
    dbSdk.onValue(dbSdk.ref(db, 'atelier/phase2/choix'), (snapshot) => {
      selections = snapshot.val() || {};
      render();
      setStatus('Connecté · 25 propositions synchronisées avec la Phase 1', 'ok');
    }, showDatabaseError);
  } catch (error) {
    showDatabaseError(error);
  }
})();
