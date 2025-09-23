// firebaseConfig.js  (v9 COMPAT, minimal+stable)

// Load compat SDKs
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// Initialize once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('[fb] init ok', firebase.app().options.projectId);
}

// App Check (recaptcha v3). If you added a debug token in HTML, it’ll be used automatically.
try {
  const appCheck = firebase.appCheck();
  appCheck.activate('6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe', true);
  window.fbAppCheck = appCheck;
} catch (e) {
  console.warn('[fb] appCheck skipped:', e?.message || e);
}

// Ensure auth session (anonymous is fine)
firebase.auth().onAuthStateChanged(async (u) => {
  if (!u) {
    try { await firebase.auth().signInAnonymously(); console.log('[fb] anon auth ok'); }
    catch (e) { console.error('[fb] anon auth failed', e); }
  }
});

// Expose handles (simple global access)
window.fbApp   = firebase.app();
window.fbAuth  = firebase.auth();
window.db      = firebase.firestore();
window.storage = firebase.storage();

export const app = window.fbApp;
export const db  = window.db;
export const storage = window.storage;
