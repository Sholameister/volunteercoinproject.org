// kycUtils.js

// ✅ Load Firebase compat directly (assumes you include both scripts in HTML)
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven"
};

if (!firebase.apps?.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore(); // ✅ Safe compat-style

// Globals (accessible in login.html)
export let walletAddress = null;
export let tierLevel = null;
export let tierMultiplier = 1;

// DOM element bindings (optional override)
let walletDisplayEl, kycStatusEl, tierStatusEl, tokenCalcEl, badgeEl;

// Setup DOM bindings from host page
export function setKycDomElements({ walletDisplay, kycStatus, tierStatus, tokenCalc, badge }) {
  walletDisplayEl = walletDisplay;
  kycStatusEl = kycStatus;
  tierStatusEl = tierStatus;
  tokenCalcEl = tokenCalc;
  badgeEl = badge;
}

// Connect Phantom and check KYC
export async function connectAndCheckKYC() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom Wallet not found. Please install it.");
    return;
  }

  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();

    if (walletDisplayEl) walletDisplayEl.textContent = `✅ Connected: ${walletAddress}`;
    localStorage.setItem("connectedWallet", walletAddress);

    if (kycStatusEl) {
      kycStatusEl.textContent = "Checking KYC status...";
      kycStatusEl.className = "pending";
    }

    const doc = await db.collection("verifiedKYC").doc(walletAddress).get();
    if (doc.exists) {
      const data = doc.data();
      const status = data.status || "pending";
      const tier = data.tier || 1;

      tierLevel = tier;
      tierMultiplier = tier === 3 ? 1.5 : tier === 2 ? 1.25 : 1;

      if (status === "approved") {
        if (kycStatusEl) {
          kycStatusEl.textContent = "✅ KYC Approved";
          kycStatusEl.className = "approved";
        }

        if (tierStatusEl) tierStatusEl.textContent = `🎖️ Verified Tier: ${tier}`;
        if (tokenCalcEl) tokenCalcEl.textContent = `💰 You earn ${tierMultiplier} LVBTN/hour`;

        if (badgeEl) {
          badgeEl.textContent = tier === 3 ? "⚡ Tier 3: Elite Volunteer"
            : tier === 2 ? "🚗 Tier 2: Driver"
            : "🧡 Tier 1: Starter";
        }

        // Log to sessionLogs
        await db.collection("sessionLogs").add({
          wallet: walletAddress,
          tier,
          timestamp: new Date()
        });

        return true; // ✅ success

      } else {
        setKYCRejected("🕐 KYC Pending");
      }

    } else {
      setKYCRejected("❌ KYC Not Found");
    }

  } catch (err) {
    console.error("Wallet/KYC error:", err);
    setKYCRejected("❌ Error checking KYC");
  }
}

function setKYCRejected(message) {
  if (kycStatusEl) {
    kycStatusEl.textContent = message;
    kycStatusEl.className = "error";
  }
  if (tierStatusEl) tierStatusEl.textContent = "";
  if (tokenCalcEl) tokenCalcEl.textContent = "";
  if (badgeEl) badgeEl.textContent = "";
}
