import { db, storage } from './firebase-app.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Globals
let walletAddress = null;
let tierLevel = null;
let tierMultiplier = 1;

// DOM elements
let walletDisplayEl, kycStatusEl, tierStatusEl, tokenCalcEl, badgeEl;

function setKycDomElements({ walletDisplay, kycStatus, tierStatus, tokenCalc, badge }) {
  walletDisplayEl = walletDisplay;
  kycStatusEl = kycStatus;
  tierStatusEl = tierStatus;
  tokenCalcEl = tokenCalc;
  badgeEl = badge;
}

async function checkKYC(walletAddressInput) {
  walletAddress = walletAddressInput;

  try {
    const docRef = doc(db, "kycStatus", walletAddress);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      tierLevel = data.tier || null;

      const sessionLogged = await logVolunteerSession(walletAddress, tierLevel);
      if (sessionLogged) console.log("✅ Session logged successfully!");
      return tierLevel;
    } else {
      setKYCRejected("⚠️ KYC Not Found");
      return null;
    }
  } catch (error) {
    console.error("❌ Error checking KYC:", error);
    setKYCRejected("❌ Error checking KYC");
    return null;
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

async function logVolunteerSession(walletAddress, tierLevel) {
  try {
    await db.collection("sessionLogs").add({
      wallet: walletAddress,
      tier: tierLevel,
      timestamp: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error logging session:", error);
    return false;
  }
}

async function resumeVolunteerSession() {
  try {
    const resume = localStorage.getItem("sessionStart");
    if (resume) {
      console.log("📘 Resuming previous session from localStorage...");
      return true;
    }
    return false;
  } catch (err) {
    console.error("Resume error:", err);
    return false;
  }
}

// Attach to window for HTML scripts
window.setKycDomElements = setKycDomElements;
window.checkKYC = checkKYC;
window.resumeVolunteerSession = resumeVolunteerSession;
