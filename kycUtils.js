// kycUtils.js — COMPAT STYLE



// Use global Firebase Firestore from firebaseConfig.js

const db = window.db;

const serverTime = window.serverTime;



// Globals

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
