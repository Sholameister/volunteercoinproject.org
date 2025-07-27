import { db, storage } from './firebase-app.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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
    // Reference to Firestore document
    const docRef = doc(db, "kycStatus", walletAddress);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      setKYCRejected("❌ KYC Not Found");
      return false;
    }

    const data = docSnap.data();
    tierLevel = data.tier || null;
    tierMultiplier = data.multiplier || 1;

    const sessionLogged = await logVolunteerSession(walletAddress, tierLevel);
    if (sessionLogged) {
      console.log("Session logged successfully!");
    }

    return true;

  } catch (err) {
    console.error("❌ Wallet/KYC error:", err);
    setKYCRejected("❌ Error checking KYC");
    return false;
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
    return true;
  } catch (error) {
    console.error("Error logging session:", error);
   
  }
}
    // ✅ Smart session resume (check localStorage)
    const resume = localStorage.getItem("sessionStart");
    if (resume) {
      console.log("🔁 Resuming previous session from localStorage...");
       return true; // success
    }
    return false;
  } catch (err) {
    console.error("Resume error:", err);
    return false;
  }
}

       
      } else {
        setKYCRejected("🕐 KYC Pending");
      }
    } else {
      setKYCRejected("❌ KYC Not Found");
    

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
