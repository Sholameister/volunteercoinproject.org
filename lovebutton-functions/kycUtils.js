import { db } from './firebaseConfig.js';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp
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

// ---- KYC Check ----
async function checkKYC(wallet) {
  walletAddress = wallet;
  try {
    const docRef = doc(db, "verifiedKYC", walletAddress);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      tierLevel = data.tier || "Tier 1";

      if (kycStatusEl) kycStatusEl.textContent = "Verified";
      if (tierStatusEl) tierStatusEl.textContent = `Tier: ${tierLevel}`;
      if (badgeEl) badgeEl.textContent = tierLevel === "Tier 3" ? "Emergency Access" : "";

      const sessionLogs = await logVolunteerSession(walletAddress, tierLevel);
      if (sessionLogs) console.log("✅ Session logged successfully!");
      return tierLevel;
    } else {
      if (kycStatusEl) kycStatusEl.textContent = "Not Found";
      if (tierStatusEl) tierStatusEl.textContent = "Tier: Unverified";
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

// ---- Volunteer Session Logging ----
async function logVolunteerSession(walletAddress, tierLevel, startTime, endTime, startPhotoUrl, endPhotoUrl, location) {
  try {
    const duration = (endTime - startTime) / (1000 * 60 * 60); // hours
    const multiplier = tierLevel === 3 ? 1.5 : tierLevel === 2 ? 1.25 : 1;
    const tokensEarned = duration * multiplier;

    await addDoc(collection(db, "volunteerSessions"), {
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

// ---- Resume Volunteer Session ----
async function resumeVolunteerSession(walletAddress) {
  try {
    const q = query(collection(db, "volunteerSessions"), where("wallet", "==", walletAddress));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("✅ Previous session:", data);
      // Optional: Display past session data or set state/UI
    });
  } catch (error) {
    console.error("❌ Error resuming session:", error);
  }
}

export { checkKYC, logVolunteerSession, setKycDomElements, resumeVolunteerSession };