// firebaseConfig.js — full corrected version with App Check (compat)

// 1) Load compat SDKs
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

// 2) Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:578b2a1c345d8aea8c11b8",
  measurementId: "G-81JX007JP5"
};

// 3) Initialize Firebase app (only once)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 4) Activate App Check with reCAPTCHA v3 site key
// If a debug token is set in window.FIREBASE_APPCHECK_DEBUG_TOKEN,
// Firebase will automatically use it for Verified requests.
const appCheck = firebase.appCheck();
appCheck.activate('6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe', true);

// 5) Ensure an auth session exists (anonymous is fine for most cases)
firebase.auth().onAuthStateChanged(async (u) => {
  try {
    if (!u) await firebase.auth().signInAnonymously();
  } catch (e) {
    console.error('Anon auth failed:', e);
  }
});

// 6) Exports for use in your modules
export const app = firebase.app();
export const db = firebase.firestore();
export const storage = firebase.storage();
