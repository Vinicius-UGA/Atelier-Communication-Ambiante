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

    // Reset unique pour les tests de l'atelier.
    const markerRef = ref(db, 'atelier/_maintenance/full_reset_20260915_v1');
    const marker = await get(markerRef);
    if (marker.val() === true) return;

    await Promise.all([
      remove(ref(db, 'atelier/phase1')),
      remove(ref(db, 'atelier/phase2')),
      remove(ref(db, 'atelier/phase3'))
    ]);

    await set(markerRef, true);
    console.info('Historique de l’atelier réinitialisé : phases 1, 2 et 3 vidées.');
  } catch (err) {
    console.warn('Réinitialisation ponctuelle non exécutée :', err);
  }
})();
