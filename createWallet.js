// --- Firebase SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Your Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

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

      // 🧠 Check LVBTN balance
      const res = await fetch("https://api.mainnet-beta.solana.com", {
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
