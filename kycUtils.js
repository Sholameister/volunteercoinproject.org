import { db, storage } from './firebase-app.js';

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

// kycUtils.js (MODULAR, compatible with loginLogic.js)

export async function checkKYC(walletAddress) {
  try {
    const docRef = window.db ? window.db.collection('kycStatus').doc(walletAddress) : null;

    if (!docRef) {
      console.error('Firestore is not initialized.');
      return null;
    }

    const docSnap = await docRef.get();

    if (docSnap.exists()) {
      const data = docSnap.data();
      const sessionLogged = await logVolunteerSession(walletAddress, data.tier);
      if (sessionLogged) {
        console.log("Session logged successfully!");
      }
      return data.tier || null;
    }
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error checking KYC:", error);
    return null;
  }
}

async function logVolunteerSession(walletAddress, tierLevel) {
  try {
    // 🔐 Log session connection
    await db.collection("sessionLogs").add({
      wallet: walletAddress,
      tier: tierLevel,
      timestamp: new Date()
    });

    // ✅ Smart session resume (check localStorage)
    const resume = localStorage.getItem("sessionStart");
    if (resume) {
      console.log("🔁 Resuming previous session from localStorage...");
    }

    return true; // success
  } catch (err) {
    console.error("Wallet/KYC error:", err);
    setKYCRejected("❌ Error checking KYC");
    return false;
  }
}

       
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
