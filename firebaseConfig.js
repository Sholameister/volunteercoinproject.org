// firebaseConfig.js — fixed version
// Uses correct Firebase API key + reCAPTCHA site key

// Load App Check (for reCAPTCHA v3)
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

// OPTIONAL: enable debug during testing (remove in production)
// self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

// Initialize App Check with your reCAPTCHA site key
const appCheck = firebase.appCheck();
appCheck.activate('6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe', true); // ✅ reCAPTCHA key here

// Load compat SDKs
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';

// ✅ Your real Firebase config (apiKey starts with AIza...)
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",  // Firebase API key
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app", // corrected bucket
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// Initialize Firebase (global compat API)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Classic handles (usable with firebase.* on older pages)
const app = firebase.app();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for ES modules
export { app, db, storage };

// Ensure all clients have some auth (anon allowed)
firebase.auth().onAuthStateChanged(async (u) => {
  try {
    if (!u) {
      await firebase.auth().signInAnonymously();
    }
  } catch (e) {
    console.error('Anon auth failed:', e);
  }
});
