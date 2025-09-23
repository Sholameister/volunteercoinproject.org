// signup.js — wallet connect + KYC/tier display + auto-redirect

import { handleConnect } from './connectWallet.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

// Helper for DOM
const $ = (id) => document.getElementById(id);

// Page init
document.addEventListener('DOMContentLoaded', () => {
  const connectBtn        = $('connectWalletBtn');
  const walletAddressSlot = $('walletAddress') || $('signupWalletDisplay');
  const walletStatus      = $('walletStatus');
  const kycStatus         = $('kycStatus');
  const tierInfo          = $('tierInfo');
  const kycBlock          = $('kycBlock'); // wrapper for Blockpass button

  // If not the signup page, bail quietly
  if (!connectBtn || !kycStatus || !tierInfo) return;

  const LOGIN_URL   = './login.html';
  let walletAddr    = null;
  let pollingTimer  = null;

  // ---------- paint helpers ----------
  function paintTier(tier) {
    const t = Number(tier) || 1;
    tierInfo.textContent = `Tier: ${t}`;
    tierInfo.classList.remove('tier-1', 'tier-2', 'tier-3');
    tierInfo.classList.add(t === 3 ? 'tier-3' : t === 2 ? 'tier-2' : 'tier-1');
  }

  function paintWallet(addr) {
    const short = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : '';
    if (walletAddressSlot) walletAddressSlot.textContent = addr ? `Wallet: ${short}` : 'Wallet: Not Connected';
    if (walletStatus)      walletStatus.textContent      = addr ? '✅ Wallet Connected' : 'Wallet not connected';
  }

  function toast(msg){
    const t = document.createElement('div');
    t.innerText = msg;
    t.style = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 1800);
  }

  // ---------- auth ----------
  async function ensureAnonAuth() {
    try {
      const auth = getAuth();
      if (!auth.currentUser) await signInAnonymously(auth);
    } catch (e) {
      console.error('[signup] Anonymous sign-in failed:', e);
    }
  }

  // ---------- Firestore (compat) lookups ----------
  // Uses window.db from firebaseConfig.js (compat)
  async function fetchKycTierAndStatus(addr) {
    if (!window.db) {
      console.error('[signup] Firestore not ready');
      return { approved: false, tier: 1 };
    }
    try {
      // 1) verifiedKYC/<wallet>
      const ref1  = window.db.collection('verifiedKYC').doc(addr);
      let   snap1 = await ref1.get();

      if (!snap1.exists) {
        const ref1lc = window.db.collection('verifiedKYC').doc((addr || '').toLowerCase());
        snap1 = await ref1lc.get();
      }

      if (snap1.exists) {
        const d       = snap1.data() || {};
        const approved = String(d.status || '').toLowerCase() === 'approved';
        const tier     = Number(d.tier ?? (approved ? 2 : 1)) || 1;
        return { approved, tier };
      }

      // 2) legacy users/<wallet>
      const ref2  = window.db.collection('users').doc(addr);
      const snap2 = await ref2.get();
      if (snap2.exists) {
        const u   = snap2.data() || {};
        const tier = Number(u.tier ?? 1) || 1;
        const approved = Boolean(u.kycApproved ?? (tier > 1));
        return { approved, tier };
      }

      return { approved: false, tier: 1 };
    } catch (e) {
      console.error('[signup] fetchKycTierAndStatus failed:', e);
      return { approved: false, tier: 1 };
    }
  }

  async function refreshKycNow(addr, { announce = false } = {}) {
    const { approved, tier } = await fetchKycTierAndStatus(addr);
    paintTier(tier);
    if (kycStatus) kycStatus.textContent = `KYC: ${approved ? '✅ Approved' : '⏳ Pending'}`;
    if (kycBlock)  kycBlock.style.display = approved ? 'none' : 'block';

    // Fire GA event safely (guard undefined)
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'signup_completed', {
        method: 'wallet',
        user_id: addr,
        tier_level: tier
      });
    }

    if (approved) {
      if (announce) toast('KYC Approved — taking you to the volunteer page…');
      setTimeout(() => { window.location.href = LOGIN_URL; }, 800);
    }
  }

  function startKycPolling(addr, ms=4000, maxMs=120000) {
    stopKycPolling();
    const started = Date.now();
    pollingTimer = setInterval(async () => {
      if (Date.now() - started > maxMs) return stopKycPolling();
      await refreshKycNow(addr);
    }, ms);
  }

  function stopKycPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = null;
  }

  // ---------- connect button ----------
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        const resp = await handleConnect(); // should return publicKey string OR an object with .publicKey
        const addr =
          (typeof resp === 'string' && resp) ||
          resp?.publicKey?.toString?.() ||
          window.appWallet?.publicKey ||
          window.solana?.publicKey?.toString?.() ||
          null;

        if (!addr) return;

        walletAddr = addr;
        paintWallet(addr);
        await ensureAnonAuth();
        await refreshKycNow(addr, { announce: true });
        startKycPolling(addr);
      } catch (e) {
        console.error('[signup] connect failed:', e);
      }
    });
  }

  // ---------- global wallet events ----------
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (!addr) return;
    walletAddr = addr;
    paintWallet(addr);
    await ensureAnonAuth();
    await refreshKycNow(addr, { announce: true });
    startKycPolling(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    walletAddr = null;
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    if (kycBlock)  kycBlock.style.display = 'block';
    stopKycPolling();
  });

  // ---------- re-check when returning from KYC ----------
  window.addEventListener('focus', () => {
    if (walletAddr) refreshKycNow(walletAddr);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && walletAddr) refreshKycNow(walletAddr);
  });

  // ---------- already connected on load ----------
  const preAddr =
    window.appWallet?.publicKey ||
    window.solana?.publicKey?.toString?.();

  if (preAddr) {
    walletAddr = preAddr;
    paintWallet(preAddr);
    ensureAnonAuth().finally(() => {
      refreshKycNow(preAddr);
      startKycPolling(preAddr);
    });
  } else {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    if (kycBlock)  kycBlock.style.display = 'block';
  }
});
