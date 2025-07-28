import { db, storage } from './firebase-app.js';
import { collection, addDoc,
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
  walletDisplayEl = walletDisplay || null;
  kycStatusEl = kycStatus || null;
  tierStatusEl = tierStatus || null;
  tokenCalcEl = tokenCalc || null;
  badgeEl = badge || null;
}


async function checkKYC(walletAddress) {
  walletAddress = walletAddress;

  try {
    const docRef = doc(db, "verifiedKYC", walletAddress);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      tierLevel = data.tier || "Tier 1";

      if (kycStatusE1) kycStatusE1.textContent = "Verified";
      if (tierStatusE1) tierStatusE1.textContent = `Tier: ${TierLevel}`;
      if (badgeE1) badgeE1.textContent = tierLevel === "Tier 3" ? "Emergency Access" : "";

      const sessionLogs = await logVolunteerSession(walletAddress, tierLevel);
      if (sessionLogs) console.log("✅ Session logged successfully!");
      return tierLevel;
    } else {
      if (kycStatusE1) kycStatusE1.textContent = "Not Found";
      if (tierStatusE1) tierStatusE1.textContent = "Tier: Unverified";
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
      timestamp: serverTimestamp()
    });

    console.log("✅ Volunteer session logged.");
  } catch (err) {
    console.error("❌ Error logging session:", err);
  }
}
async function resumeVolunteerSession(walletAddress) {
  try {
    const q = query(collection(db, "volunteerSessions"), where("wallet", "==", walletAddress));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("✅ Previous session:", data);
      // Optional: You can display past session data here (or set state/UI if needed)
    });

  } catch (error) {
    console.error("❌ Error resuming session:", error);
  }
}

export { checkKYC, logVolunteerSession, setKycDomElements, resumeVolunteerSession };

