// --- Firebase SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lovebutton-heaven.firebasestorage.app",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ LVBTN Token Mint Address
const LVBTN_MINT = "Hgi2xp2XYiwaNDkuLLsAED3Wjyjidz1nxj7UGqfnTB8s";

// ✅ Connect and Verify
async function solanaConnectAndCheck() {
  const solana = window.solana;
  const display = document.getElementById("walletAddress");

  if (solana && solana.isPhantom) {
    try {
      const resp = await solana.connect();
      const wallet = resp.publicKey.toString();
let balance = 0;
try {
  const res = await fetch("https://api.helius.xyz/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 2ad90be8-8d2c-bde9-5938674027a7"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        wallet,
        { mint: LVBTN_MINT },
        { encoding: "jsonParsed" }
      ]
    })
  });

  const data = await res.json();
  balance = data.result.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
} catch (e) {
  console.error("Token check error:", e);
}

      // 🧠 Check LVBTN balance
      const res = await fetch("https://api.helius.xyz/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            wallet,
            { mint: LVBTN_MINT },
            { encoding: "jsonParsed" }
          ]
        })
      });

      const data = await res.json();
      const balance = data.result.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;

      if (balance >= 1) {
        display.innerText = `✅ Welcome back Volunteers!\nWallet: ${wallet}\nLVBTN: ${balance}`;

        // ✅ Log to Firebase
        await addDoc(collection(db, "logins"), {
          wallet,
          balance,
          timestamp: serverTimestamp()
        });
      } else {
        display.innerText = `⚠️ You need at least 1 LVBTN to access this area.\nWallet: ${wallet}`;
      }
    } catch (err) {
      console.error("Solana error:", err);
      display.innerText = "❌ Error connecting to wallet.";
    }
  } else {
    alert("Please install Phantom or Solflare Wallet.");
  }
}

// ✅ Button Listener
document.getElementById("connectWallet").addEventListener("click", solanaConnectAndCheck);
