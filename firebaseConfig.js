
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId:"1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
const db = getFirestore();
