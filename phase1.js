(() => {
  'use strict';

  const MAX_MESSAGES = 1000;
  const NTFY_BASE = 'https://ntfy.sh';
  const TOPICS = {
    1: 'aca_p1_g1_zF8mT2rQvA6nK3xP',
    2: 'aca_p1_g2_hN4wY7cLsR9bV2qM',
    3: 'aca_p1_g3_pD6kX3tJaQ8mW5sF',
    4: 'aca_p1_g4_uC9rB2nZeL7vH4xK',
    5: 'aca_p1_g5_mQ5sG8yPkT3dR6wN'
  };

  const currentGroup = Number(document.body.dataset.group || '1');
  let viewedGroup = currentGroup;
  let stream = null;
  let chatMessages = new Map();

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const nameInput = $('#participant-name');
  const messageInput = $('#chat-message');
  const sendButton = $('#chat-send');
  const chatList = $('#chat-list');
  const chatStatus = $('#chat-status');
  const chatCounter = $('#chat-counter');
  const chatViewTitle = $('#chat-view-title');
  const readOnlyNotice = $('#read-only-notice');

  const savedName = localStorage.getItem('aca-participant-name') || '';
  if (nameInput) nameInput.value = savedName;
  nameInput?.addEventListener('input', () => localStorage.setItem('aca-participant-name', nameInput.value.trim()));

  function safeJson(value) { try { return JSON.parse(value); } catch { return null; } }
  function parsePayload(message) {
    const parsed = safeJson(message);
    return parsed && typeof parsed === 'object' ? parsed : { author: 'Participant', text: String(message || '') };
  }
  function formatTime(unix) {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(unix * 1000));
  }
  function setStatus(text, kind = 'neutral') {
    if (!chatStatus) return;
    chatStatus.textContent = text;
    chatStatus.dataset.kind = kind;
  }
  function renderChat() {
    if (!chatList) return;
    chatList.innerHTML = '';
    const ordered = [...chatMessages.values()].sort((a, b) => a.time !== b.time ? a.time - b.time : String(a.id).localeCompare(String(b.id)));
    if (!ordered.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Aucun message pour le moment. Lancez le brainstorming !';
      chatList.appendChild(empty);
    } else {
      ordered.forEach((msg) => {
        const payload = parsePayload(msg.message);
        const item = document.createElement('article');
        item.className = 'chat-message';
        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        const author = document.createElement('strong');
        author.textContent = payload.author || 'Participant';
        const time = document.createElement('span');
        time.textContent = formatTime(msg.time);
        meta.append(author, time);
        const text = document.createElement('p');
        text.textContent = payload.text || '';
        item.append(meta, text);
        chatList.appendChild(item);
      });
    }
    if (chatCounter) chatCounter.textContent = `${ordered.length} / ${MAX_MESSAGES}`;
    if (viewedGroup === currentGroup && sendButton) sendButton.disabled = ordered.length >= MAX_MESSAGES;
    chatList.scrollTop = chatList.scrollHeight;
  }
  function handleMessage(msg) {
    if (!msg || msg.event !== 'message') return;
    if (msg.title === 'brainstorm') {
      chatMessages.set(msg.id, msg);
      renderChat();
      return;
    }
    if (viewedGroup === currentGroup && /^selection-[1-5]$/.test(msg.title || '')) {
      const slot = Number(msg.title.split('-')[1]);
      applyIdeaMessage(slot, msg);
    }
  }
  async function fetchTopicMessages(group) {
    const response = await fetch(`${NTFY_BASE}/${TOPICS[group]}/json?poll=1&since=all`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => safeJson(line)).filter(Boolean);
  }
  function openStream(group) {
    if (stream) stream.close();
    stream = new EventSource(`${NTFY_BASE}/${TOPICS[group]}/sse`);
    stream.onopen = () => setStatus('Chat connecté en direct', 'ok');
    stream.onerror = () => setStatus('Reconnexion au chat…', 'warn');
    stream.onmessage = (event) => handleMessage(safeJson(event.data));
  }
  async function loadGroup(group) {
    viewedGroup = group;
    chatMessages = new Map();
    renderChat();
    setStatus('Chargement…');
    $$('.group-view-button').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.group) === group));
    if (chatViewTitle) chatViewTitle.textContent = group === currentGroup ? `Brainstorming — Groupe ${group}` : `Brainstorming du Groupe ${group} — lecture seule`;
    const readOnly = group !== currentGroup;
    if (readOnlyNotice) readOnlyNotice.hidden = !readOnly;
    if (messageInput) messageInput.disabled = readOnly;
    if (nameInput) nameInput.disabled = readOnly;
    if (sendButton) sendButton.disabled = readOnly;
    try {
      const all = await fetchTopicMessages(group);
      all.filter(m => m.event === 'message' && m.title === 'brainstorm').forEach(m => chatMessages.set(m.id, m));
      if (group === currentGroup) {
        all.filter(m => m.event === 'message' && /^selection-[1-5]$/.test(m.title || '')).forEach(m => {
          const slot = Number(m.title.split('-')[1]);
          applyIdeaMessage(slot, m);
        });
      }
      renderChat();
      openStream(group);
    } catch (error) {
      setStatus('Impossible de charger le chat. Vérifiez la connexion Internet.', 'error');
      console.error(error);
    }
  }
  async function publishJson(payload) {
    const response = await fetch(`${NTFY_BASE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  async function sendChatMessage() {
    if (viewedGroup !== currentGroup) return;
    const author = (nameInput?.value || '').trim();
    const text = (messageInput?.value || '').trim();
    if (!author) {
      nameInput?.focus();
      setStatus('Indiquez votre prénom ou un pseudonyme.', 'warn');
      return;
    }
    if (!text) return;
    if (chatMessages.size >= MAX_MESSAGES) {
      setStatus('La limite de 1 000 messages est atteinte.', 'warn');
      return;
    }
    sendButton.disabled = true;
    setStatus('Envoi…');
    try {
      const msg = await publishJson({ topic: TOPICS[currentGroup], title: 'brainstorm', message: JSON.stringify({ author, text }) });
      messageInput.value = '';
      handleMessage(msg);
      setStatus('Message envoyé', 'ok');
    } catch (error) {
      setStatus('Échec de l’envoi. Réessayez.', 'error');
      console.error(error);
    } finally {
      sendButton.disabled = chatMessages.size >= MAX_MESSAGES;
      messageInput?.focus();
    }
  }
  sendButton?.addEventListener('click', sendChatMessage);
  messageInput?.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      sendChatMessage();
    }
  });
  $$('.group-view-button').forEach(btn => btn.addEventListener('click', () => loadGroup(Number(btn.dataset.group))));

  function applyIdeaMessage(slot, msg) {
    const payload = parsePayload(msg.message);
    const textarea = $(`#idea-${slot}`);
    const meta = $(`#idea-${slot}-meta`);
    if (textarea && document.activeElement !== textarea) textarea.value = payload.text || '';
    if (meta) meta.textContent = payload.text ? `Dernière mise à jour : ${payload.author || 'Groupe'}, ${formatTime(msg.time)}` : 'Non renseignée';
  }
  $$('.idea-save').forEach(button => {
    button.addEventListener('click', async () => {
      const slot = Number(button.dataset.slot);
      const textarea = $(`#idea-${slot}`);
      const author = (nameInput?.value || localStorage.getItem('aca-participant-name') || 'Groupe').trim() || 'Groupe';
      const text = (textarea?.value || '').trim();
      const meta = $(`#idea-${slot}-meta`);
      if (!text) {
        if (meta) meta.textContent = 'Écrivez une proposition avant d’enregistrer.';
        textarea?.focus();
        return;
      }
      button.disabled = true;
      if (meta) meta.textContent = 'Enregistrement…';
      try {
        const msg = await publishJson({
          topic: TOPICS[currentGroup],
          title: `selection-${slot}`,
          sequence_id: `selection-${slot}`,
          message: JSON.stringify({ author, text })
        });
        applyIdeaMessage(slot, msg);
      } catch (error) {
        if (meta) meta.textContent = 'Échec de l’enregistrement. Réessayez.';
        console.error(error);
      } finally {
        button.disabled = false;
      }
    });
  });

  loadGroup(currentGroup);
})();
