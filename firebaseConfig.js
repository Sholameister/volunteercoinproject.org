// firebaseConfig.js — v9 COMPAT + ESM bridge
// One config for all pages: classic firebase.* AND <script type="module"> imports.

import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';

// Your Firebase config (bucket per your setup)
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app", // keep as you use today
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// Initialize once (global compat API)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Classic handles (for any pages using firebase.*)
const app = firebase.app();
const db = firebase.firestore();
const storage = firebase.storage();

// ESM exports (for your module pages like loginLogic.js)
export { app, db, storage };
// Ensure request.auth != null for Storage Rules
firebase.auth().onAuthStateChanged(async (u) => {
  try {
    if (!u) await firebase.auth().signInAnonymously();
  } catch (e) {
    console.error('Anon auth failed:', e);
  }
});
