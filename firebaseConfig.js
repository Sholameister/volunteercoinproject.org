// firebaseConfig.js (browser-compatible, no imports)

const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

const app = firebase.apps.length === 0
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();

// Export Firestore and Storage
const db = firebase.firestore();
const storage = firebase.storage();
const serverTime = firebase.firestore.FieldValue.serverTimestamp();

window.db = db;
window.storage = storage;
window.serverTime = serverTime;
