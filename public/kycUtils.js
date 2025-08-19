// kycUtils.js — COMPAT STYLE
// kycUtils.js

import { db } from './firebaseConfig.js';

// Fetch the tier level for a given wallet address
export async function fetchTierLevel(walletAddress) {
  const docRef = db.collection('users').doc(walletAddress);
  const doc = await docRef.get();
  return doc.exists ? doc.data().tier || 1 : 1;
}

// Fetch the legacy blacklist (wallets not allowed)
export async function fetchBlockedWallets() {
  const response = await fetch('https://raw.githubusercontent.com/Sholameister/volunteercoinproject.org/main/legacy-unrecognized-wallets.json');
  const data = await response.json();
  return data.wallets || [];
}

// Optional DOM update helper
export function updateKycDom(tier, status = 'Approved') {
  const tierDisplay = document.getElementById('tierInfo');
  const kycStatus = document.getElementById('kycStatus');

  if (tierDisplay && kycStatus) {
    kycStatus.textContent = `KYC: ✅ ${status}`;
    tierDisplay.textContent = `Tier: ${tier}`;

    tierDisplay.className = 'tier-badge';
    if (tier === 3) tierDisplay.classList.add('tier-3');
    else if (tier === 2) tierDisplay.classList.add('tier-2');
    else tierDisplay.classList.add('tier-1');
  } else {
    console.warn("❗ Could not update KYC DOM — element(s) missing.");
  }
}


let walletAddress = null;
let tierLevel = null;



// DOM hooks for optional injection

let walletDisplayEl, kycStatusEl, tierStatusEl, tokenCalcEl, badgeEl;



function setKycDomElements({ walletDisplay, kycStatus, tierStatus, tokenCalc, badge }) {
  walletDisplayEl = walletDisplay || null;
  kycStatusEl = kycStatus || null;
  tierStatusEl = tierStatus || null;
  tokenCalcEl = tokenCalc || null;
  badgeEl = badge || null;
}



// ---- KYC Verification ----

async function checkKYC(wallet) {
  walletAddress = wallet;
  try {
    const docRef = db.collection("verifiedKYC").doc(walletAddress);
    const docSnap = await docRef.get();


    if (docSnap.exists) {
      const data = docSnap.data();
      tierLevel = data.tier || "Tier 1";

      if (kycStatusEl) kycStatusEl.textContent = "Verified";
      if (tierStatusEl) tierStatusEl.textContent = `Tier: ${tierLevel}`;
      if (badgeEl) badgeEl.textContent = tierLevel === "Tier 3" ? "Emergency Access" : "";
      return tierLevel;
    } else {
      if (kycStatusEl) kycStatusEl.textContent = "Not Found";
      if (tierStatusEl) tierStatusEl.textContent = "Tier: Unverified";
      return null;

    }

  } catch (error) {

    console.error("❌ Error checking KYC:", error);

    setKYCRejected("❌ KYC check failed");

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



// ---- Volunteer Session Logging ----

async function logVolunteerSession(walletAddress, tierLevel, startTime, endTime, startPhotoUrl, endPhotoUrl, geolocation) {

  try {

    const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60); // in hours

    const multiplier = tierLevel === "Tier 3" ? 1.5 : tierLevel === "Tier 2" ? 1.25 : 1;

    const tokensEarned = duration * multiplier;



    await db.collection("volunteerSessions")

      .add({

        walletAddress,

        tierLevel,

        startTime: new Date(startTime),

        endTime: new Date(endTime),

        startPhotoUrl,

        endPhotoUrl,

        geolocation,

        tokensEarned,

        usdValue: tokensEarned * 2.5,

        timestamp: serverTime

      });



    console.log("✅ Volunteer session logged.");

  } catch (err) {

    console.error("❌ Error logging session:", err);

  }

}



// ---- Resume Session (Optional Future Use) ----

async function resumeVolunteerSession(walletAddress) {

  try {

    const snapshot = await db

      .collection("volunteerSessions")

      .where("walletAddress", "==", walletAddress)

      .orderBy("timestamp", "desc")

      .limit(1)

      .get();



    if (snapshot.empty) {

      console.log("No previous sessions found.");

      return;

    }



    snapshot.forEach((doc) => {

      const data = doc.data();

      console.log("✅ Resumed session:", data);

      // Optional: restore session UI

    });

  } catch (error) {

    console.error("❌ Error resuming session:", error);

  }

}



// Attach to window

window.checkKYC = checkKYC;

window.logVolunteerSession = logVolunteerSession;

window.setKycDomElements = setKycDomElements;

window.resumeVolunteerSession = resumeVolunteerSession;

window.updateKycDom = updateKycDom;