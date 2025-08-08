// firebaseConfig.js — COMPAT VERSION to match db.collection(...) usage
import firebase from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4JwJ1PN8xFFxNhIryx3NShADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  // ⚠️ Make sure this bucket actually exists in this project:
  // usually it's "<projectId>.appspot.com"
  storageBucket: "lovebutton-heaven.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

firebase.initializeApp(firebaseConfig);

// Expose compat-style globals used across your app
const db = firebase.firestore();
const storage = firebase.storage();
const serverTime = firebase.firestore.FieldValue.serverTimestamp();

window.db = db;
window.storage = storage;
window.serverTime = serverTime;

export { db, storage, serverTime };


Sent from my iPhone
