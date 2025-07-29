import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Wallet connect logic
let walletAddress = null;

async function connectWalletAndLoadSessions() {
  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    document.getElementById("walletDisplay").innerText = `Wallet: ${walletAddress}`;
    loadSessionHistory(walletAddress);
  } catch (err) {
    alert("Wallet connection failed.");
    console.error(err);
  }
}

async function loadSessionHistory(wallet) {
  const sessionList = document.getElementById("sessionList");
  sessionList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "volunteerSessions", wallet, "sessionLogs"));

  let totalTokens = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    totalTokens += parseFloat(data.tokensEarned || 0);

    const card = document.createElement("div");
    card.className = "sessionCard";
    card.innerHTML = `
      <p><strong>Date:</strong> ${new Date(data.startTime).toLocaleString()}</p>
      <p><strong>Tier:</strong> ${data.tierLevel}</p>
      <p><strong>Duration:</strong> ${data.durationHours} hours</p>
      <p><strong>LVBTN Earned:</strong> ${data.tokensEarned}</p>
      <p><strong>USD Value:</strong> $${data.usdValue}</p>
      <p><strong>Start Photo:</strong><br><img src="${data.startPhotoUrl}" /></p>
      <p><strong>After Photo:</strong><br><img src="${data.endPhotoUrl}" /></p>
    `;
    sessionList.appendChild(card);
  });

  document.getElementById("totalTokens").innerText = `Total LVBTN Earned: ${totalTokens.toFixed(2)}`;
}

// Auto-connect if Phantom installed
window.addEventListener('load', () => {
  if (window.solana && window.solana.isPhantom) {
    connectWalletAndLoadSessions();
  } else {
    alert("Please install Phantom Wallet to use the dashboard.");
  }
});
