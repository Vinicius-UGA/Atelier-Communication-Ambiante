(async () => {
  'use strict';

  const currentGroup = Math.min(5, Math.max(1, Number(document.body.dataset.group || '1')));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const workspace = $('#workspace');
  const imageLayer = $('#image-layer');
  const canvas = $('#drawing-canvas');
  const ctx = canvas?.getContext('2d');
  const uploadInput = $('#image-upload');
  const drawToggle = $('#draw-toggle');
  const saveStatus = $('#save-status');
  const presenceStatus = $('#presence-status');
  const selectedProposalEl = $('#selected-proposal');
  const clearDrawingButton = $('#clear-drawing');
  const undoButton = $('#undo-stroke');
  const answerEls = Object.fromEntries(['what','how','where'].map(key => [key, $(`[data-section="${key}"] .answer-space`)]));

  let dbSdk = null;
  let db = null;
  let penColor = '#d62828';
  let drawingMode = false;
  let drawing = false;
  let activeStrokeRef = null;
  let activeStroke = null;
  let strokeWriteTimer = null;
  let strokes = {};
  let legacyDrawing = '';
  let imageItems = {};
  let localManipulatingImageId = null;
  let resizeTimer = null;
  let syncTimers = {};
  let pendingRemoteText = {};
  const clientId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

  const firebaseConfig = {
    apiKey: 'AIzaSyCVZqGFfnwb8iesFizm2escpgYVoIQI6Fc',
    authDomain: 'atelier-communication-ambiante.firebaseapp.com',
    databaseURL: 'https://atelier-communication-ambiante-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'atelier-communication-ambiante',
    storageBucket: 'atelier-communication-ambiante.firebasestorage.app',
    messagingSenderId: '43940720482',
    appId: '1:43940720482:web:c5e6e8776d7f399caf463b'
  };

  const basePath = `atelier/phase3/groupe${currentGroup}`;
  const livePath = `${basePath}/live`;

  function setStatus(text, kind = '') {
    if (!saveStatus) return;
    saveStatus.textContent = text;
    saveStatus.className = `save-status ${kind}`.trim();
  }

  function sanitizeAnswerHtml(html) {
    const t = document.createElement('template');
    t.innerHTML = typeof html === 'string' ? html : '';
    t.content.querySelectorAll('script,style,iframe,object,embed,svg,math,link,meta,img,video,audio,form,input,button,textarea,select').forEach(el => el.remove());
    t.content.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => el.removeAttribute(a.name)));
    return t.innerHTML || '<br>';
  }

  function insertPlainText(text) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  Object.entries(answerEls).forEach(([key, el]) => {
    el?.addEventListener('paste', e => {
      e.preventDefault();
      insertPlainText(e.clipboardData?.getData('text/plain') || '');
      scheduleTextWrite(key);
    });
    el?.addEventListener('input', () => scheduleTextWrite(key));
    el?.addEventListener('blur', () => {
      if (pendingRemoteText[key] != null) {
        const remote = pendingRemoteText[key];
        pendingRemoteText[key] = null;
        if (el.innerHTML !== remote) el.innerHTML = remote;
      }
    });
  });

  function scheduleTextWrite(key) {
    clearTimeout(syncTimers[key]);
    setStatus('Synchronisation…');
    syncTimers[key] = setTimeout(async () => {
      try {
        const html = sanitizeAnswerHtml(answerEls[key]?.innerHTML || '');
        await dbSdk.set(dbSdk.ref(db, `${livePath}/text/${key}`), {
          html,
          clientId,
          updatedAt: dbSdk.serverTimestamp()
        });
        setStatus('Synchronisé automatiquement.', 'ok');
      } catch (e) {
        console.error(e);
        setStatus('Erreur de synchronisation.', 'error');
      }
    }, 180);
  }

  function subscribeText() {
    Object.entries(answerEls).forEach(([key, el]) => {
      dbSdk.onValue(dbSdk.ref(db, `${livePath}/text/${key}`), snap => {
        const value = snap.val();
        if (!value || typeof value.html !== 'string') return;
        const clean = sanitizeAnswerHtml(value.html);
        if (value.clientId === clientId) return;
        if (document.activeElement === el) {
          pendingRemoteText[key] = clean;
          return;
        }
        if (el.innerHTML !== clean) el.innerHTML = clean;
      });
    });
  }

  function normalizeRect(item) {
    return {
      x: Math.max(0, Math.min(92, Number(item.x) || 10)),
      y: Math.max(0, Math.min(92, Number(item.y) || 10)),
      w: Math.max(12, Math.min(70, Number(item.w) || 35)),
      h: Math.max(7, Math.min(60, Number(item.h) || 24))
    };
  }

  function syncImageDom() {
    if (!imageLayer) return;
    const ids = new Set(Object.keys(imageItems));
    [...imageLayer.querySelectorAll('.workspace-image')].forEach(box => {
      if (!ids.has(box.dataset.id)) box.remove();
    });

    Object.values(imageItems).forEach(item => {
      if (!item?.id || !item?.src) return;
      let box = imageLayer.querySelector(`.workspace-image[data-id="${CSS.escape(item.id)}"]`);
      if (!box) box = createImageElement(item);
      if (localManipulatingImageId === item.id) return;
      const r = normalizeRect(item);
      box.style.left = `${r.x}%`;
      box.style.top = `${r.y}%`;
      box.style.width = `${r.w}%`;
      box.style.height = `${r.h}%`;
    });
  }

  function createImageElement(item) {
    const box = document.createElement('div');
    box.className = 'workspace-image';
    box.dataset.id = item.id;
    const r = normalizeRect(item);
    box.style.left = `${r.x}%`;
    box.style.top = `${r.y}%`;
    box.style.width = `${r.w}%`;
    box.style.height = `${r.h}%`;

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = 'Image ajoutée au document';
    box.appendChild(img);

    const hint = document.createElement('span');
    hint.className = 'drag-hint';
    hint.textContent = 'Déplacer';
    box.appendChild(hint);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete-image';
    del.textContent = '×';
    del.title = 'Supprimer cette image';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      setStatus('Synchronisation…');
      await dbSdk.remove(dbSdk.ref(db, `${livePath}/images/${item.id}`));
      setStatus('Synchronisé automatiquement.', 'ok');
    });
    box.appendChild(del);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.title = 'Redimensionner';
    box.appendChild(handle);

    makeDraggable(box, item.id, handle);
    imageLayer.appendChild(box);
    return box;
  }

  function makeDraggable(box, id, handle) {
    let mode = '';
    let start = null;
    let startRect = null;
    let writeTimer = null;

    const pushPosition = () => {
      clearTimeout(writeTimer);
      writeTimer = setTimeout(async () => {
        const item = imageItems[id];
        if (!item) return;
        try {
          await dbSdk.update(dbSdk.ref(db, `${livePath}/images/${id}`), {
            x: item.x, y: item.y, w: item.w, h: item.h,
            clientId, updatedAt: dbSdk.serverTimestamp()
          });
        } catch (e) { console.error(e); }
      }, 70);
    };

    const onMove = e => {
      if (!mode || !start || !workspace || !imageItems[id]) return;
      e.preventDefault();
      const wr = workspace.getBoundingClientRect();
      const dx = ((e.clientX - start.x) / wr.width) * 100;
      const dy = ((e.clientY - start.y) / wr.height) * 100;
      const item = imageItems[id];
      if (mode === 'drag') {
        item.x = Math.max(0, Math.min(100 - item.w, startRect.x + dx));
        item.y = Math.max(0, Math.min(100 - item.h, startRect.y + dy));
      } else {
        item.w = Math.max(12, Math.min(80, startRect.w + dx));
        item.h = Math.max(7, Math.min(70, startRect.h + dy));
        item.x = Math.min(item.x, 100 - item.w);
        item.y = Math.min(item.y, 100 - item.h);
      }
      box.style.left = `${item.x}%`;
      box.style.top = `${item.y}%`;
      box.style.width = `${item.w}%`;
      box.style.height = `${item.h}%`;
      pushPosition();
    };

    const onUp = async () => {
      if (!mode) return;
      mode = '';
      localManipulatingImageId = null;
      window.removeEventListener('pointermove', onMove);
      clearTimeout(writeTimer);
      const item = imageItems[id];
      if (item) {
        await dbSdk.update(dbSdk.ref(db, `${livePath}/images/${id}`), {
          x:item.x,y:item.y,w:item.w,h:item.h,clientId,updatedAt:dbSdk.serverTimestamp()
        });
      }
      setStatus('Synchronisé automatiquement.', 'ok');
    };

    box.addEventListener('pointerdown', e => {
      if (drawingMode || e.target.closest('.delete-image') || e.target === handle) return;
      const item = imageItems[id];
      if (!item) return;
      mode = 'drag';
      localManipulatingImageId = id;
      start = {x:e.clientX,y:e.clientY};
      startRect = {x:item.x,y:item.y,w:item.w,h:item.h};
      setStatus('Synchronisation…');
      window.addEventListener('pointermove', onMove, {passive:false});
      window.addEventListener('pointerup', onUp, {once:true});
    });

    handle.addEventListener('pointerdown', e => {
      if (drawingMode) return;
      e.stopPropagation();
      const item = imageItems[id];
      if (!item) return;
      mode = 'resize';
      localManipulatingImageId = id;
      start = {x:e.clientX,y:e.clientY};
      startRect = {x:item.x,y:item.y,w:item.w,h:item.h};
      setStatus('Synchronisation…');
      window.addEventListener('pointermove', onMove, {passive:false});
      window.addEventListener('pointerup', onUp, {once:true});
    });
  }

  async function compressImage(file) {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', .80);
  }

  async function addFiles(files) {
    if (!files?.length) return;
    toggleDrawing(false);
    const existing = Object.keys(imageItems).length;
    const remaining = Math.max(0, 6 - existing);
    if (!remaining) { setStatus('Maximum de 6 images atteint.', 'error'); uploadInput.value = ''; return; }
    setStatus('Import et synchronisation…');
    for (const file of [...files].slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const src = await compressImage(file);
        const imageRef = dbSdk.push(dbSdk.ref(db, `${livePath}/images`));
        const n = Object.keys(imageItems).length % 5;
        await dbSdk.set(imageRef, {
          id:imageRef.key, src, x:12+n*4, y:10+n*5, w:34, h:24,
          clientId, createdAt:dbSdk.serverTimestamp(), updatedAt:dbSdk.serverTimestamp()
        });
      } catch (e) {
        console.error(e);
        setStatus('Une image n’a pas pu être importée.', 'error');
      }
    }
    uploadInput.value = '';
    setStatus('Synchronisé automatiquement.', 'ok');
  }

  function subscribeImages() {
    dbSdk.onValue(dbSdk.ref(db, `${livePath}/images`), snap => {
      imageItems = snap.val() || {};
      Object.entries(imageItems).forEach(([id,item]) => { if (item && !item.id) item.id = id; });
      syncImageDom();
    });
  }

  function canvasRect() { return canvas.getBoundingClientRect(); }
  function pointFromEvent(e) {
    const r = canvasRect();
    return {x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height};
  }
  function drawStroke(stroke) {
    if (!stroke?.points?.length || !ctx) return;
    const r = canvasRect();
    ctx.strokeStyle = stroke.color || '#d62828';
    ctx.lineWidth = Number(stroke.width) || 4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((p,i) => {
      const x = Number(p.x) * r.width, y = Number(p.y) * r.height;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.lineTo(Number(p.x)*r.width+.01, Number(p.y)*r.height+.01);
    }
    ctx.stroke();
  }

  function redrawCanvas() {
    if (!ctx || !workspace) return;
    const r = canvasRect();
    ctx.clearRect(0,0,r.width,r.height);
    if (legacyDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img,0,0,r.width,r.height);
        Object.values(strokes).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).forEach(drawStroke);
        if (activeStroke) drawStroke(activeStroke);
      };
      img.src = legacyDrawing;
      return;
    }
    Object.values(strokes).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).forEach(drawStroke);
    if (activeStroke) drawStroke(activeStroke);
  }

  function resizeCanvas() {
    if (!workspace || !canvas || !ctx) return;
    const r = workspace.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width*dpr));
    canvas.height = Math.max(1, Math.round(r.height*dpr));
    canvas.style.width = `${r.width}px`; canvas.style.height = `${r.height}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    redrawCanvas();
  }

  function scheduleStrokeWrite() {
    clearTimeout(strokeWriteTimer);
    strokeWriteTimer = setTimeout(async () => {
      if (!activeStrokeRef || !activeStroke) return;
      try {
        await dbSdk.update(activeStrokeRef, {points:activeStroke.points, updatedAt:dbSdk.serverTimestamp()});
      } catch (e) { console.error(e); }
    }, 55);
  }

  async function beginStroke(e) {
    if (!drawingMode || !ctx) return;
    e.preventDefault();
    drawing = true;
    const p = pointFromEvent(e);
    activeStrokeRef = dbSdk.push(dbSdk.ref(db, `${livePath}/strokes`));
    activeStroke = {id:activeStrokeRef.key,color:penColor,width:4,points:[p],clientId,createdAt:Date.now()};
    setStatus('Synchronisation…');
    await dbSdk.set(activeStrokeRef, {...activeStroke, createdAt:dbSdk.serverTimestamp(), updatedAt:dbSdk.serverTimestamp()});
    canvas.setPointerCapture?.(e.pointerId);
  }

  function moveStroke(e) {
    if (!drawing || !activeStroke) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    const prev = activeStroke.points.at(-1);
    if (prev && Math.hypot(p.x-prev.x,p.y-prev.y) < .002) return;
    if (activeStroke.points.length < 900) activeStroke.points.push(p);
    redrawCanvas();
    scheduleStrokeWrite();
  }

  async function endStroke(e) {
    if (!drawing) return;
    drawing = false;
    clearTimeout(strokeWriteTimer);
    try { canvas.releasePointerCapture?.(e.pointerId); } catch (_) {}
    if (activeStrokeRef && activeStroke) {
      await dbSdk.update(activeStrokeRef, {points:activeStroke.points, updatedAt:dbSdk.serverTimestamp()});
    }
    activeStrokeRef = null;
    activeStroke = null;
    setStatus('Synchronisé automatiquement.', 'ok');
  }

  function subscribeDrawing() {
    dbSdk.onValue(dbSdk.ref(db, `${livePath}/strokes`), snap => { strokes = snap.val() || {}; redrawCanvas(); });
    dbSdk.onValue(dbSdk.ref(db, `${livePath}/legacyDrawing`), snap => { legacyDrawing = typeof snap.val()==='string' ? snap.val() : ''; redrawCanvas(); });
  }

  function toggleDrawing(force) {
    drawingMode = typeof force === 'boolean' ? force : !drawingMode;
    workspace?.classList.toggle('drawing-mode', drawingMode);
    drawToggle?.classList.toggle('active', drawingMode);
    drawToggle?.setAttribute('aria-pressed', String(drawingMode));
    if (drawToggle) drawToggle.textContent = drawingMode ? '✎ Dessin actif' : '✎ Dessiner';
  }

  async function undoLastStroke() {
    const entries = Object.entries(strokes);
    if (!entries.length) return;
    entries.sort(([,a],[,b]) => (a.createdAt||0)-(b.createdAt||0));
    const [id] = entries.at(-1);
    setStatus('Synchronisation…');
    await dbSdk.remove(dbSdk.ref(db, `${livePath}/strokes/${id}`));
    setStatus('Synchronisé automatiquement.', 'ok');
  }

  async function clearDrawing() {
    setStatus('Synchronisation…');
    await Promise.all([
      dbSdk.remove(dbSdk.ref(db, `${livePath}/strokes`)),
      dbSdk.remove(dbSdk.ref(db, `${livePath}/legacyDrawing`))
    ]);
    setStatus('Synchronisé automatiquement.', 'ok');
  }

  async function migrateOldWorkspaceIfNeeded() {
    const liveSnap = await dbSdk.get(dbSdk.ref(db, livePath));
    if (liveSnap.exists()) return;
    const oldSnap = await dbSdk.get(dbSdk.ref(db, `${basePath}/workspace`));
    const old = oldSnap.val();
    if (!old) return;

    const updates = {};
    if (old.text?.documentHtml) {
      const t = document.createElement('template'); t.innerHTML = old.text.documentHtml;
      ['what','how','where'].forEach(key => {
        const el = t.content.querySelector(`[data-section="${key}"] .answer-space`);
        if (el) updates[`text/${key}`] = {html:sanitizeAnswerHtml(el.innerHTML),clientId:'migration',updatedAt:Date.now()};
      });
    } else if (old.text) {
      ['what','how','where'].forEach(key => {
        if (typeof old.text[key] === 'string' && old.text[key]) updates[`text/${key}`] = {html:sanitizeAnswerHtml(old.text[key]),clientId:'migration',updatedAt:Date.now()};
      });
    }
    const oldImages = Array.isArray(old.images) ? old.images.filter(Boolean) : (old.images ? Object.values(old.images) : []);
    oldImages.forEach((img,idx) => {
      if (!img?.src) return;
      const id = img.id || `migrated-${idx}`;
      updates[`images/${id}`] = {...img,id,clientId:'migration'};
    });
    if (typeof old.drawing === 'string' && old.drawing) updates['legacyDrawing'] = old.drawing;
    if (Object.keys(updates).length) await dbSdk.update(dbSdk.ref(db, livePath), updates);
  }

  async function loadSelectedProposal() {
    try {
      const cs = await dbSdk.get(dbSdk.ref(db, `atelier/phase2/choix/groupe${currentGroup}`));
      const choice = cs.val();
      if (!choice?.proposalId || !choice?.sourceGroup || !choice?.slot) {
        selectedProposalEl.className = 'selected-proposal empty';
        selectedProposalEl.textContent = 'Aucune modification prioritaire n’a encore été retenue pour ce groupe en Phase 2.';
        return;
      }
      const ps = await dbSdk.get(dbSdk.ref(db, `atelier/phase1/groupe${choice.sourceGroup}/propositions/${choice.slot}`));
      const text = ps.val();
      selectedProposalEl.className = 'selected-proposal';
      selectedProposalEl.textContent = typeof text === 'string' && text.trim() ? text : 'La proposition retenue n’est plus renseignée en Phase 1.';
    } catch (e) {
      console.error(e);
      selectedProposalEl.className = 'selected-proposal empty';
      selectedProposalEl.textContent = 'Impossible de charger la modification retenue.';
    }
  }

  function setupPresence() {
    const pRef = dbSdk.ref(db, `${livePath}/presence/${clientId}`);
    dbSdk.set(pRef, {connectedAt:dbSdk.serverTimestamp()});
    dbSdk.onDisconnect(pRef).remove();
    dbSdk.onValue(dbSdk.ref(db, `${livePath}/presence`), snap => {
      const n = snap.exists() ? Object.keys(snap.val() || {}).length : 0;
      if (presenceStatus) presenceStatus.textContent = `${n} participant${n>1?'s':''} en ligne`;
    });
  }

  uploadInput?.addEventListener('change', e => addFiles(e.target.files));
  drawToggle?.addEventListener('click', () => toggleDrawing());
  $$('.pen-color').forEach(button => button.addEventListener('click', () => {
    penColor = button.dataset.color || penColor;
    $$('.pen-color').forEach(b => b.classList.toggle('active', b === button));
    toggleDrawing(true);
  }));
  clearDrawingButton?.addEventListener('click', clearDrawing);
  undoButton?.addEventListener('click', undoLastStroke);
  canvas?.addEventListener('pointerdown', beginStroke);
  canvas?.addEventListener('pointermove', moveStroke);
  canvas?.addEventListener('pointerup', endStroke);
  canvas?.addEventListener('pointercancel', endStroke);
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 180);
  });

  try {
    const [appSdk,authSdk,databaseSdk] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js')
    ]);
    dbSdk = databaseSdk;
    const app = appSdk.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    await authSdk.signInAnonymously(auth);
    db = dbSdk.getDatabase(app);

    setStatus('Connexion établie.', 'ok');
    resizeCanvas();
    await migrateOldWorkspaceIfNeeded();
    await loadSelectedProposal();
    subscribeText();
    subscribeImages();
    subscribeDrawing();
    setupPresence();
    setStatus('Synchronisé automatiquement.', 'ok');
  } catch (e) {
    console.error(e);
    setStatus('Connexion Firebase impossible.', 'error');
    selectedProposalEl.className = 'selected-proposal empty';
    selectedProposalEl.textContent = 'Connexion à la base impossible.';
  }
})();
