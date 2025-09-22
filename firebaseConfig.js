// firebaseConfig.js — corrected init ORDER and bucket value

// 1) Load compat SDKs
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

// 2) Your Firebase config (API key must be the AIza... key from Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",      // <-- Firebase Web API key
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  // IMPORTANT: storageBucket must be the *appspot.com* name, not firebasestorage.app
  storageBucket: "lovebutton-heaven.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// 3) Initialize the app FIRST
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 4) THEN activate App Check (reCAPTCHA v3 site key here)
const appCheck = firebase.appCheck();
appCheck.activate('6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe', true);

// 5) Ensure an auth session exists (anonymous is fine)
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
