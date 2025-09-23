// firebaseConfig.js — compat SDK + App Check, stable order

// 1) Load compat SDKs
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// 3) Initialize Firebase once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 4) App Check (reCAPTCHA v3)
// If you set window.FIREBASE_APPCHECK_DEBUG_TOKEN in HTML, SDK will use it automatically.
const appCheck = firebase.appCheck();
// second param = isTokenAutoRefreshEnabled
appCheck.activate('6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe', true);

// 5) Ensure an auth session (anon ok for logger pages)
firebase.auth().onAuthStateChanged(async (u) => {
  try {
    if (!u) await firebase.auth().signInAnonymously();
  } catch (e) {
    console.error('Anon auth failed:', e);
  }
});

// 6) Exports for your modules
export const app = firebase.app();
export const db = firebase.firestore();
export const storage = firebase.storage();
