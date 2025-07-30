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

let walletAddress = null;

async function connectWalletAndLoadSessions() {
  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    document.getElementById("walletDisplay").innerText = `Wallet: ${walletAddress}`;
    await loadSessionHistory(walletAddress);
  } catch (err) {
    alert("Wallet connection failed.");
    console.error("Wallet error:", err);
  }
}

async function loadSessionHistory(wallet) {
  const sessionList = document.getElementById("sessionList");
  sessionList.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "volunteerSessions", wallet, "sessionLogs"));

    let totalTokens = 0;
    let totalUSD = 0;
    let totalHours = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const hours = parseFloat(data.durationHours || 0);
      const tokens = parseFloat(data.tokensEarned || 0);
      const usd = parseFloat(data.usdValue || 0);
      const tier = data.tierLevel || "N/A";
      const startPhoto = data.startPhotoUrl || "https://via.placeholder.com/120?text=No+Photo";
      const endPhoto = data.endPhotoUrl || "https://via.placeholder.com/120?text=No+Photo";

      totalTokens += tokens;
      totalUSD += usd;
      totalHours += hours;

      const card = document.createElement("div");
      card.className = "sessionCard";
      card.innerHTML = `
        <p><strong>Date:</strong> ${new Date(data.startTime).toLocaleString()}</p>
        <p><strong>Tier:</strong> ${tier}</p>
        <p><strong>Duration:</strong> ${hours.toFixed(2)} hours</p>
        <p><strong>LVBTN Earned:</strong> ${tokens.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        <p><strong>USD Value:</strong> $${usd.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        <p><strong>Start Photo:</strong><br><img src="${startPhoto}" width="120"/></p>
        <p><strong>After Photo:</strong><br><img src="${endPhoto}" width="120"/></p>
      `;
      sessionList.appendChild(card);
    });

    document.getElementById("totalTokens").innerText = `Total LVBTN Earned: ${totalTokens.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("usdTotalValue").innerText = `Total USD Value: $${totalUSD.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("totalHours").innerText = `Total Hours Volunteered: ${totalHours.toFixed(1)}`;
  } catch (e) {
    console.error("Failed to load sessions:", e);
    sessionList.innerHTML = `<p style="color:red;">Failed to load volunteer history.</p>`;
  }
}

window.addEventListener('load', () => {
  if (window.solana?.isPhantom) {
    connectWalletAndLoadSessions();
  } else {
    alert("Please install Phantom Wallet to use the dashboard.");
  }
});
