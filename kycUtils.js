// kycUtils.js — Firebase v9 modular
import { db, doc, getDoc } from './firebaseConfig.js';

// Check a user's KYC status and tier
export async function checkKYCStatus(wallet) {
  try {
    if (!wallet) return { tier: 1, approved: false };

    // Try exact wallet match first
    let ref = doc(db, "verifiedKYC", wallet);
    let snap = await getDoc(ref);

    // Fallback: lowercase wallet ID
    if (!snap.exists()) {
      ref = doc(db, "verifiedKYC", wallet.toLowerCase());
      snap = await getDoc(ref);
    }

    if (snap.exists()) {
      const data = snap.data() || {};
      const approved = String(data.status || "").toLowerCase() === "approved";
      const tier = Number(data.tier ?? (approved ? 2 : 1)) || 1;
      return { tier, approved };
    }

    // Nothing found → default
    return { tier: 1, approved: false };
  } catch (e) {
    console.error("checkKYCStatus failed:", e);
    return { tier: 1, approved: false };
  }
}

// Update DOM with tier info
export function updateKycDom({ tier, approved }) {
  const tierDisplay = document.getElementById('tierInfo');
  const kycStatus = document.getElementById('kycStatus');
  if (!tierDisplay || !kycStatus) return;

  if (tier === 1 && !approved) {
    tierDisplay.textContent = "Tier: 1 (Basic)";
    tierDisplay.className = "tier-badge tier-1";
    kycStatus.textContent = "KYC: ⏳ Pending";
  } else if (tier === 2) {
    tierDisplay.textContent = "Tier: 2 (KYC + Driver)";
    tierDisplay.className = "tier-badge tier-2";
    kycStatus.textContent = "KYC: ✅ Verified!";
  } else if (tier === 3) {
    tierDisplay.textContent = "Tier: 3 (Full Verified)";
    tierDisplay.className = "tier-badge tier-3";
    kycStatus.textContent = "KYC: ✅ Verified + Hours!";
  }
}
