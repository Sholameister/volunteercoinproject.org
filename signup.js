// signup.js — wallet connect + KYC/tier display
import { handleConnect } from './connectWallet.js';
import { db, doc, getDoc } from './firebaseConfig.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const looksLikeSignup =
    !!document.getElementById('connectWalletBtn') &&
    !!document.getElementById('kycStatus') &&
    !!document.getElementById('tierInfo');
  if (!looksLikeSignup) return;

  const $ = (id) => document.getElementById(id);
  const connectBtn = $('connectWalletBtn');
  const walletAddressSlot = $('walletAddress') || $('signupWalletDisplay');
  const walletStatus = $('walletStatus');
  const kycStatus = $('kycStatus');
  const tierInfo = $('tierInfo');
  const kycBlock = $('kycBlock'); // 🔥 wrapper for Blockpass button

  function paintTier(tier) {
    const t = Number(tier) || 1;
    tierInfo.textContent = `Tier: ${t}`;
    tierInfo.classList.remove('tier-1', 'tier-2', 'tier-3');
    tierInfo.classList.add(t === 3 ? 'tier-3' : t === 2 ? 'tier-2' : 'tier-1');
  }

  function paintWallet(addr) {
    const short = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '';
    if (walletAddressSlot)
      walletAddressSlot.textContent = addr
        ? `Wallet: ${short}`
        : 'Wallet: Not Connected';
    if (walletStatus)
      walletStatus.textContent = addr
        ? '✅ Wallet Connected'
        : 'Wallet not connected';
  }

  async function fetchKycTierAndStatus(addr) {
    try {
      // 1) verifiedKYC/<wallet> (exact)
      let snap = await getDoc(doc(db, 'verifiedKYC', addr));
      if (!snap.exists()) {
        // lowercase fallback
        snap = await getDoc(doc(db, 'verifiedKYC', (addr || '').toLowerCase()));
      }
      if (snap.exists()) {
        const d = snap.data() || {};
        const approved = String(d.status || '').toLowerCase() === 'approved';
        const tier = Number(d.tier ?? (approved ? 2 : 1)) || 1;
        return { approved, tier };
      }
      // 2) legacy users/<wallet>
      const userSnap = await getDoc(doc(db, 'users', addr));
      if (userSnap.exists()) {
        const u = userSnap.data() || {};
        const tier = Number(u.tier ?? 1) || 1;
        const approved = Boolean(u.kycApproved ?? (tier > 1));
        return { approved, tier };
      }
      return { approved: false, tier: 1 };
    } catch (e) {
      console.error('fetchKycTierAndStatus failed', e);
      return { approved: false, tier: 1 };
    }
  }

  async function loadProfile(addr) {
    const { approved, tier } = await fetchKycTierAndStatus(addr);
    paintTier(tier);

    if (kycStatus)
      kycStatus.textContent = `KYC: ${
        approved ? '✅ Approved' : '⏳ Pending'
      }`;

    // 🔥 Hide Blockpass button if already approved
    if (kycBlock) {
      kycBlock.style.display = approved ? 'none' : 'block';
    }
  }

  async function ensureAnonAuth() {
    const auth = getAuth();
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.error('Anonymous sign-in failed:', e);
    }
  }

  // Connect button
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const resp = await handleConnect(); // opens Phantom
      const addr =
        resp?.publicKey?.toString?.() || window.appWallet?.publicKey || null;
      if (!addr) return;
      paintWallet(addr);
      await ensureAnonAuth();
      await loadProfile(addr);
    });
  }

  // Global wallet events
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (!addr) return;
    paintWallet(addr);
    await ensureAnonAuth();
    await loadProfile(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    if (kycBlock) kycBlock.style.display = 'block';
  });

  // If already connected on load
  const preAddr =
    window.appWallet?.publicKey || window.solana?.publicKey?.toString?.();
  if (preAddr) {
    paintWallet(preAddr);
    ensureAnonAuth().finally(() => loadProfile(preAddr));
  } else {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    if (kycBlock) kycBlock.style.display = 'block';
  }
});

