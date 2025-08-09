// firebaseConfig.js — v9 modular init
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  appId: "…"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
