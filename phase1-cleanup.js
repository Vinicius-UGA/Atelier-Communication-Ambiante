import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getDatabase, ref, get, remove, set } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCVZqGFfnwb8iesFizm2escpgYVoIQI6Fc",
  authDomain: "atelier-communication-ambiante.firebaseapp.com",
  databaseURL: "https://atelier-communication-ambiante-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "atelier-communication-ambiante",
  storageBucket: "atelier-communication-ambiante.firebasestorage.app",
  messagingSenderId: "43940720482",
  appId: "1:43940720482:web:c5e6e8776d7f399caf463b"
};

(async () => {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    if (!auth.currentUser) await signInAnonymously(auth);
    const db = getDatabase(app);

    const markerRef = ref(db, 'atelier/_maintenance/cleanup_g1_slot4_teste_20260908');
    const marker = await get(markerRef);
    if (marker.val() === true) return;

    const slotRef = ref(db, 'atelier/phase1/groupe1/propositions/4');
    const snap = await get(slotRef);
    const value = snap.val();
    if (typeof value === 'string' && value.trim().toLowerCase() === 'teste') {
      await remove(slotRef);
    }
    await set(markerRef, true);
  } catch (err) {
    console.warn('Nettoyage ponctuel non exécuté :', err);
  }
})();
