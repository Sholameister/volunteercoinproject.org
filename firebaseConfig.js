// firebaseConfig.js — Firebase v9 modular exports

// Core
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';

// Firestore
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Storage
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

// --- Your Firebase config (bucket per your console screenshot) ---
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app", // <-- correct for your project
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Named exports
export { db, storage };

