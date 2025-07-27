import { db, storage } from './firebase-app.js';
import {
  doc,
  getDoc,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Globals
export let walletAddress = null;
export let tierLevel = null;
export let tierMultiplier = 1;

// DOM element bindings (optional override)
let walletDisplayEl, kycStatusEl, tierStatusEl, tokenCalcEl, badgeEl;

export function setKycDomElements({ walletDisplay, kycStatus, tierStatus, tokenCalc, badge }) {
  walletDisplayEl = walletDisplay;
  kycStatusEl = kycStatus;
  tierStatusEl = tierStatus;
  tokenCalcEl = tokenCalc;
  badgeEl = badge;
}

export async function checkKYC(walletAddress) {
  try {
    const docRef = doc(db, "kycStatus", walletAddress);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const sessionLogged = await logVolunteerSession(walletAddress, data.tier);
      if (sessionLogged) {
        console.log("✅ Session logged successfully!");
      }
      return data.tier || null;
    } else {
      setKYCRejected("⚠️ KYC Not Found");
      return null;
    }
  } catch (error) {
    console.error("Error checking KYC:", error);
    setKYCRejected("❌ Error checking KYC");
    return null;
  }
}

async function logVolunteerSession(walletAddress, tierLevel) {
  try {
    const sessionRef = collection(db, "sessionLogs");
    await addDoc(sessionRef, {
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

export async function resumeVolunteerSession() {
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

function setKYCRejected(message) {
  if (kycStatusEl) {
    kycStatusEl.textContent = message;
    kycStatusEl.className = "error";
  }
  if (tierStatusEl) tierStatusEl.textContent = "";
  if (tokenCalcEl) tokenCalcEl.textContent = "";
  if (badgeEl) badgeEl.textContent = "";
}
