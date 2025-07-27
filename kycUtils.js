import { db, storage } from './firebase-app.js';
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

// ✅ FIXED: defined before use
async function logVolunteerSession(walletAddress, tierLevel, startTime, endTime, startPhotoUrl, endPhotoUrl, location) {
  try {
    const duration = (endTime - startTime) / (1000 * 60 * 60); // hours
    const multiplier = tierLevel === 3 ? 1.5 : tierLevel === 2 ? 1.25 : 1;
    const tokensEarned = duration * multiplier;

    await db.collection("volunteerSessions").add({
      walletAddress,
      tierLevel,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      startPhotoUrl,
      endPhotoUrl,
      location,
      tokensEarned,
      usdValue: tokensEarned * 2.5,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Volunteer session logged.");
  } catch (err) {
    console.error("❌ Error logging session:", err);
  }
}

import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
async function checkKYC(walletAddress) {
  walletAddress = walletAddress;

  try {
    const docRef = doc(db, "verifiedKYC", walletAddress);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      tierLevel = data.tier || null;

      const sessionLogs = await logvolunteerSession(walletAddress, tierLevel);
      if (sessionLogs) console.log("✅ Session logged successfully!");
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
export { checkKYC, logVolunteerSession, setKycDomElements  };
// Attach to window for HTML access
window.setKycDomElements = setKycDomElements;
window.checkKYC = checkKYC;
window.resumeVolunteerSession = resumeVolunteerSession;
