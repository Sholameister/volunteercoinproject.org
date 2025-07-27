// firebaseConfig.js
import firebase from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage-compat.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();

export { db, storage };
