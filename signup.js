// signup.js — wallet connect + KYC/tier display (upgraded UX)
// Keeps your structure; adds auto-refresh, proceed button, and optional auto-redirect.

import { handleConnect } from './connectWallet.js';
import { db, doc, getDoc } from './firebaseConfig.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  // Run only if expected elements exist
  const looksLikeSignup = !!document.getElementById('connectWalletBtn')
                       && !!document.getElementById('kycStatus')
                       && !!document.getElementById('tierInfo');
  if (!looksLikeSignup) return;

  const $ = (id) => document.getElementById(id);

  // DOM
  const connectBtn          = $('connectWalletBtn');
  const walletAddressSlot   = $('walletAddress') || $('signupWalletDisplay');
  const walletStatus        = $('walletStatus');
  const kycStatus           = $('kycStatus');
  const tierInfo            = $('tierInfo');

  // UX targets we’ll inject
  const navArea = document.body; // we'll append CTAs near the bottom

  // Settings
  const AUTO_REDIRECT_ON_APPROVAL = true;
  const LOGIN_URL = './login.html';

  let walletAddr = null;
  let pollingTimer = null;

  // ---- Paint helpers ----
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

  // ---- KYC fetch (your two-collection lookup preserved) ----
  async function fetchKycTierAndStatus(addr) {
    try {
      // 1) verifiedKYC/<wallet>
      let snap = await getDoc(doc(db, 'verifiedKYC', addr));
      if (!snap.exists()) {
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

  async function ensureAnonAuth() {
    const auth = getAuth();
    try { await signInAnonymously(auth); }
    catch (e) { console.error('Anonymous sign-in failed:', e); }
  }

  // ---- CTA helpers (no HTML changes needed) ----
  function injectButton(id, label, onClick) {
    let btn = document.getElementById(id);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = id;
      btn.textContent = label;
      btn.style.display = 'inline-block';
      btn.style.margin = '8px';
      btn.addEventListener('click', onClick);
      // insert before the existing nav links area (last script)
      const lastScript = document.querySelector('script[type="module"][src="./signup.js"]');
      (lastScript?.parentNode || navArea).insertBefore(btn, lastScript);
    } else {
      btn.textContent = label;
      btn.onclick = onClick;
    }
    return btn;
  }

  function showProceedButton() {
    injectButton('proceedToVolunteerBtn', 'Proceed to Volunteer ➜', () => {
      window.location.href = LOGIN_URL;
    }).style.display = 'inline-block';
  }

  function hideProceedButton() {
    const btn = document.getElementById('proceedToVolunteerBtn');
    if (btn) btn.style.display = 'none';
  }

  function showRefreshButton() {
    injectButton('refreshKycBtn', 'Refresh KYC', async () => {
      if (!walletAddr) return;
      await refreshKycNow(walletAddr, {announce:true});
    }).style.display = 'inline-block';
  }

  // ---- KYC refresh + auto-redirect logic ----
  async function refreshKycNow(addr, {announce=false} = {}) {
    const { approved, tier } = await fetchKycTierAndStatus(addr);
    paintTier(tier);
    if (kycStatus) kycStatus.textContent = `KYC: ${approved ? '✅ Approved' : '⏳ Pending'}`;

    if (approved) {
      showProceedButton();
      if (announce) {
        try {
          const toast = document.createElement('div');
          toast.textContent = 'KYC Approved — you can start volunteering!';
          toast.style = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999';
          document.body.appendChild(toast);
          setTimeout(()=>toast.remove(), 2000);
        } catch {}
      }
      if (AUTO_REDIRECT_ON_APPROVAL) {
        // brief pause so user can see the approval tick
        setTimeout(()=> window.location.href = LOGIN_URL, 800);
      }
    } else {
      hideProceedButton();
    }
  }

  // simple polling loop while user is likely bouncing to/from Blockpass
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

  // ---- Connect button ----
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const resp = await handleConnect(); // opens wallet (Phantom/etc via your adapter)
      const addr = resp?.publicKey?.toString?.() || window.appWallet?.publicKey || null;
      if (!addr) return;
      walletAddr = addr;
      paintWallet(addr);
      await ensureAnonAuth();
      await refreshKycNow(addr, {announce:true});
      showRefreshButton();
      // begin a short polling window so returning from Blockpass updates quickly
      startKycPolling(addr);
    });
  }

  // ---- Global wallet events ----
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (!addr) return;
    walletAddr = addr;
    paintWallet(addr);
    await ensureAnonAuth();
    await refreshKycNow(addr, {announce:true});
    showRefreshButton();
    startKycPolling(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    walletAddr = null;
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    hideProceedButton();
    stopKycPolling();
  });

  // ---- Visibility/focus re-check (user returns from Blockpass) ----
  window.addEventListener('focus', () => { if (walletAddr) refreshKycNow(walletAddr); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && walletAddr) refreshKycNow(walletAddr);
  });

  // ---- Already connected on load ----
  const preAddr = window.appWallet?.publicKey || (window.solana?.publicKey?.toString?.());
  if (preAddr) {
    walletAddr = preAddr;
    paintWallet(preAddr);
    ensureAnonAuth().finally(() => {
      refreshKycNow(preAddr, {announce:false});
      showRefreshButton();
      startKycPolling(preAddr);
    });
  } else {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
  }
});

