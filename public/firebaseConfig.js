// firebaseConfig.js (modular, browser-compatible)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4JwJ1PN8xFFxNhIryx3NShADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

const app = initializeApp(firebaseConfig);

// Modular-compatible exports
const db = getFirestore(app);
const storage = getStorage(app);
const serverTime = serverTimestamp();

window.db = db;
window.storage = storage;
window.serverTime = serverTime;

export { db, storage, serverTime };