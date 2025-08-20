// kycUtils.js — Firebase v9 modular

import { db, doc, getDoc } from './firebaseConfig.js';

// Check a user's KYC tier
export async function checkKYCStatus(wallet) {
  try {
    const docRef = doc(db, "kyc", wallet);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.tier || 1;
    } else {
      return 1;
    }
  } catch (e) {
    console.error("checkKYCStatus failed:", e);
    return 1;
  }
}

// Update DOM with tier info
export function updateKycDom(tierLevel) {
  const tierDisplay = document.getElementById('tierInfo');
  const kycStatus = document.getElementById('kycStatus');

  if (!tierDisplay || !kycStatus) return;

  if (tierLevel === 1) {
    tierDisplay.textContent = "Tier: 1 (Basic)";
    tierDisplay.className = "tier-badge tier-1";
    kycStatus.textContent = "Basic Signup Complete";
  } else if (tierLevel === 2) {
    tierDisplay.textContent = "Tier: 2 (KYC + Driver)";
    tierDisplay.className = "tier-badge tier-2";
    kycStatus.textContent = "KYC Verified!";
  } else if (tierLevel === 3) {
    tierDisplay.textContent = "Tier: 3 (Full Verified)";
    tierDisplay.className = "tier-badge tier-3";
    kycStatus.textContent = "KYC & Hours Verified!";
  }
}
