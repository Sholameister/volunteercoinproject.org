// kycUtils.js — uses Firebase v9 COMPAT objects exported from firebaseConfig.js
// Your firebaseConfig.js already exports a compat Firestore instance as `db`.
import { db } from './firebaseConfig.js';

/**
 * Look up KYC by wallet address in `verifiedKYC/{wallet}`.
 * Doc shape example: { status: "approved"|"pending", tier: 1|2|3 }
 */
export async function checkKYCStatusByWallet(wallet) {
  try {
    if (!wallet) return { tier: 1, approved: false, source: 'none' };

    // Try exact, then lowercase
    let snap = await db.collection('verifiedKYC').doc(wallet).get();
    if (!snap.exists) snap = await db.collection('verifiedKYC').doc(wallet.toLowerCase()).get();

    if (snap.exists) {
      const d = snap.data() || {};
      const approved = String(d.status || '').toLowerCase() === 'approved';
      const tier = Number(d.tier ?? (approved ? 2 : 1)) || 1;

      // Safe analytics (no PII)
      try { window.gtag?.('event', 'kyc_lookup', { by: 'wallet', approved, tier }); } catch {}
      // Optional: fire verified event (safe fields only)
      if (approved) {
        try { window.gtag?.('event', 'kyc_verified', { by: 'wallet', tier }); } catch {}
      }
      return { tier, approved, source: 'verifiedKYC' };
    }
    return { tier: 1, approved: false, source: 'none' };
  } catch (e) {
    console.error('checkKYCStatusByWallet failed:', e);
    return { tier: 1, approved: false, source: 'error' };
  }
}

/**
 * Optional: Look up KYC by user UID in `users/{uid}`.
 * Doc shape example: { kycApproved: true, tier: 2 }
 */
export async function checkKYCStatusByUid(uid) {
  try {
    if (!uid) return { tier: 1, approved: false, source: 'none' };
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
      const u = snap.data() || {};
      const tier = Number(u.kycTier ?? u.tier ?? (u.kycApproved ? 2 : 1)) || 1;
      const approved = Boolean(u.kycApproved ?? (tier > 1));

      try { window.gtag?.('event', 'kyc_lookup', { by: 'uid', approved, tier }); } catch {}
      if (approved) { try { window.gtag?.('event', 'kyc_verified', { by: 'uid', tier }); } catch {} }

      return { tier, approved, source: 'users' };
    }
    return { tier: 1, approved: false, source: 'none' };
  } catch (e) {
    console.error('checkKYCStatusByUid failed:', e);
    return { tier: 1, approved: false, source: 'error' };
  }
}

/**
 * Update the on-page badges/text for KYC status.
 * Expects elements: #tierInfo (badge) and #kycStatus (text).
 */
export function updateKycDom({ tier = 1, approved = false } = {}) {
  const tierDisplay = document.getElementById('tierInfo');
  const kycStatus = document.getElementById('kycStatus');
  if (!tierDisplay || !kycStatus) return;

  if (tier >= 3) {
    tierDisplay.textContent = 'Tier: 3 (Full Verified)';
    tierDisplay.className = 'tier-badge tier-3';
    kycStatus.textContent = 'KYC: ✅ Verified + Hours!';
  } else if (tier === 2) {
    tierDisplay.textContent = 'Tier: 2 (KYC + Driver)';
    tierDisplay.className = 'tier-badge tier-2';
    kycStatus.textContent = 'KYC: ✅ Verified!';
  } else {
    tierDisplay.textContent = 'Tier: 1 (Basic)';
    tierDisplay.className = 'tier-badge tier-1';
    kycStatus.textContent = approved ? 'KYC: ✅ Verified' : 'KYC: ⏳ Pending';
  }
}
