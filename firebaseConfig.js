import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

firebase.initializeApp({ /* ... */ storageBucket: "lovebutton-heaven.appspot.com" });

const appCheck = firebase.appCheck();
// self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // (optional while testing)
appCheck.activate('6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe', true); // auto-refresh

firebase.auth().onAuthStateChanged(async (u) => {
  if (!u) await firebase.auth().signInAnonymously().catch(console.error);
});

// Your Firebase config (bucket per your setup)
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.appspot.com", // keep as you use today
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
