(async () => {
  'use strict';

  const MAX_MESSAGES = 1000;
  const currentGroup = Math.min(5, Math.max(1, Number(document.body.dataset.group || '1')));
  let viewedGroup = currentGroup;
  let chatMessages = [];
  let unsubscribeChat = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const messageInput = $('#chat-message');
  const sendButton = $('#chat-send');
  const chatList = $('#chat-list');
  const chatStatus = $('#chat-status');
  const chatCounter = $('#chat-counter');
  const chatViewTitle = $('#chat-view-title');
  const readOnlyNotice = $('#read-only-notice');

  // Interface volontairement anonyme : aucun nom, aucune heure affichée ou enregistrée.
  const nameInput = $('#participant-name');
  nameInput?.remove();
  const compose = $('.chat-compose');
  if (compose) compose.style.gridTemplateColumns = '1fr auto';
  $('.privacy-note')?.remove();
  const brainstormingIntro = $('#brainstorming .section-intro');
  if (brainstormingIntro) {
    brainstormingIntro.innerHTML = 'Le chat de votre groupe est collaboratif et se met à jour en direct. Les contributions sont <strong>anonymes et conservées de façon persistante</strong> dans la base de données de l’atelier. Chaque groupe dispose d’une limite de <strong>1 000 messages</strong>. Utilisez les boutons ci-dessous pour consulter les autres groupes en lecture seule.';
  }
  const chatFoot = $('.chat-foot');
  if (chatFoot?.children?.[0]) chatFoot.children[0].textContent = 'Messages anonymes · enregistrement permanent';

  function setStatus(text, kind = 'neutral') {
    if (!chatStatus) return;
    chatStatus.textContent = text;
    chatStatus.dataset.kind = kind;
  }

  function renderChat() {
    if (!chatList) return;
    chatList.innerHTML = '';

    if (!chatMessages.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Aucun message pour le moment. Lancez le brainstorming !';
      chatList.appendChild(empty);
    } else {
      chatMessages.forEach((msg) => {
        const item = document.createElement('article');
        item.className = 'chat-message';
        const text = document.createElement('p');
        text.textContent = msg.text;
        item.appendChild(text);
        chatList.appendChild(item);
      });
    }

    if (chatCounter) chatCounter.textContent = `${chatMessages.length} / ${MAX_MESSAGES}`;
    if (sendButton) sendButton.disabled = viewedGroup !== currentGroup || chatMessages.length >= MAX_MESSAGES;
    chatList.scrollTop = chatList.scrollHeight;
  }

  function showDatabaseError(error) {
    console.error(error);
    const code = String(error?.code || '');
    if (code.includes('permission-denied')) {
      setStatus('Accès refusé par Firebase : vérifiez les règles de la base.', 'error');
    } else if (code.includes('auth/operation-not-allowed')) {
      setStatus('Activez l’authentification anonyme dans Firebase.', 'error');
    } else {
      setStatus('Connexion Firebase impossible. Réessayez.', 'error');
    }
  }

  try {
    setStatus('Connexion à l’archive permanente…');

    const [appSdk, authSdk, dbSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js')
    ]);

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
    const db = dbSdk.getDatabase(app);

    const groupBase = (group) => `atelier/phase1/groupe${group}`;

    function subscribeToChat(group) {
      if (unsubscribeChat) unsubscribeChat();
      chatMessages = [];
      renderChat();
      setStatus('Chargement des messages…');

      const messagesRef = dbSdk.ref(db, `${groupBase(group)}/messages`);
      unsubscribeChat = dbSdk.onValue(messagesRef, (snapshot) => {
        const messages = [];
        snapshot.forEach((child) => {
          const value = child.val();
          if (typeof value === 'string' && value.trim()) {
            messages.push({ id: child.key, text: value });
          }
        });
        chatMessages = messages;
        renderChat();
        setStatus('Connecté · archive permanente', 'ok');
      }, showDatabaseError);
    }

    function loadGroup(group) {
      viewedGroup = group;
      $$('.group-view-button').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.group) === group));
      const readOnly = group !== currentGroup;
      if (chatViewTitle) chatViewTitle.textContent = readOnly ? `Brainstorming du Groupe ${group} — lecture seule` : `Brainstorming — Groupe ${group}`;
      if (readOnlyNotice) readOnlyNotice.hidden = !readOnly;
      if (messageInput) messageInput.disabled = readOnly;
      if (sendButton) sendButton.disabled = readOnly;
      subscribeToChat(group);
    }

    async function sendChatMessage() {
      if (viewedGroup !== currentGroup) return;
      const text = (messageInput?.value || '').trim();
      if (!text) return;
      if (chatMessages.length >= MAX_MESSAGES) {
        setStatus('La limite de 1 000 messages est atteinte.', 'warn');
        return;
      }

      sendButton.disabled = true;
      setStatus('Enregistrement…');
      try {
        await dbSdk.push(dbSdk.ref(db, `${groupBase(currentGroup)}/messages`), text);
        messageInput.value = '';
        setStatus('Message enregistré définitivement', 'ok');
        messageInput.focus();
      } catch (error) {
        showDatabaseError(error);
      } finally {
        sendButton.disabled = viewedGroup !== currentGroup || chatMessages.length >= MAX_MESSAGES;
      }
    }

    sendButton?.addEventListener('click', sendChatMessage);
    messageInput?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        sendChatMessage();
      }
    });
    $$('.group-view-button').forEach((btn) => btn.addEventListener('click', () => loadGroup(Number(btn.dataset.group))));

    // Les cinq propositions finales sont elles aussi sauvegardées de manière persistante.
    const proposalsRef = dbSdk.ref(db, `${groupBase(currentGroup)}/propositions`);
    dbSdk.onValue(proposalsRef, (snapshot) => {
      for (let slot = 1; slot <= 5; slot += 1) {
        const textarea = $(`#idea-${slot}`);
        const meta = $(`#idea-${slot}-meta`);
        const value = snapshot.child(String(slot)).val();
        const text = typeof value === 'string' ? value : '';
        if (textarea && document.activeElement !== textarea) textarea.value = text;
        if (meta) meta.textContent = text ? 'Enregistrée dans l’archive permanente' : 'Non renseignée';
      }
    }, showDatabaseError);

    $$('.idea-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const slot = Number(button.dataset.slot);
        const textarea = $(`#idea-${slot}`);
        const meta = $(`#idea-${slot}-meta`);
        const text = (textarea?.value || '').trim();
        if (!text) {
          if (meta) meta.textContent = 'Écrivez une proposition avant d’enregistrer.';
          textarea?.focus();
          return;
        }

        button.disabled = true;
        if (meta) meta.textContent = 'Enregistrement…';
        try {
          await dbSdk.set(dbSdk.ref(db, `${groupBase(currentGroup)}/propositions/${slot}`), text);
          if (meta) meta.textContent = 'Enregistrée dans l’archive permanente';
        } catch (error) {
          showDatabaseError(error);
          if (meta) meta.textContent = 'Échec de l’enregistrement. Réessayez.';
        } finally {
          button.disabled = false;
        }
      });
    });

    loadGroup(currentGroup);
  } catch (error) {
    showDatabaseError(error);
  }
})();
