// signup.js — wallet connect + KYC/tier display + auto-redirect to login on approval
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
  const connectBtn        = $('connectWalletBtn');
  const walletAddressSlot = $('walletAddress') || $('signupWalletDisplay');
  const walletStatus      = $('walletStatus');
  const kycStatus         = $('kycStatus');
  const tierInfo          = $('tierInfo');
  const kycBlock          = $('kycBlock'); // wrapper for Blockpass button
  const LOGIN_URL         = './login.html';

  let walletAddr = null;
  let pollingTimer = null;

  // ------- helpers -------
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

  async function ensureAnonAuth() {
    const auth = getAuth();
    try { await signInAnonymously(auth); }
    catch (e) { console.error('Anonymous sign-in failed:', e); }
  }

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

  function toast(msg){
    const t = document.createElement('div');
    t.innerText = msg;
    t.style = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 1800);
  }

// After signup success (user added to Firestore, KYC tier assigned)
gtag('event', 'signup_completed', {
  method: signupMethod, // "email", "wallet", etc.
  user_id: userWalletAddress || userEmail,
  tier_level: kycTier || 'unknown'
});
  
  async function refreshKycNow(addr, {announce=false} = {}) {
    const { approved, tier } = await fetchKycTierAndStatus(addr);
    paintTier(tier);
    if (kycStatus) kycStatus.textContent = `KYC: ${approved ? '✅ Approved' : '⏳ Pending'}`;

    // Hide/show Blockpass button
    if (kycBlock) kycBlock.style.display = approved ? 'none' : 'block';

    if (approved) {
      if (announce) toast('KYC Approved — taking you to the volunteer page…');
      // short pause so the checkmark is visible
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

  // ------- connect button -------
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const resp = await handleConnect(); // wallet connect (Phantom, etc. via your adapter)
      const addr = resp?.publicKey?.toString?.() || window.appWallet?.publicKey || window.solana?.publicKey?.toString?.() || null;
      if (!addr) return;
      walletAddr = addr;
      paintWallet(addr);
      await ensureAnonAuth();
      await refreshKycNow(addr, {announce:true});
      startKycPolling(addr);
    });
  }

  // ------- global wallet events -------
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (!addr) return;
    walletAddr = addr;
    paintWallet(addr);
    await ensureAnonAuth();
    await refreshKycNow(addr, {announce:true});
    startKycPolling(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    walletAddr = null;
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    if (kycBlock) kycBlock.style.display = 'block';
    stopKycPolling();
  });

  // ------- focus/visibility re-check (user returns from Blockpass) -------
  window.addEventListener('focus', () => { if (walletAddr) refreshKycNow(walletAddr); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && walletAddr) refreshKycNow(walletAddr);
  });

  // ------- already connected on load -------
  const preAddr = window.appWallet?.publicKey || (window.solana?.publicKey?.toString?.());
  if (preAddr) {
    walletAddr = preAddr;
    paintWallet(preAddr);
    ensureAnonAuth().finally(() => {
      refreshKycNow(preAddr);     // will redirect if already approved
      startKycPolling(preAddr);
    });
  } else {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
    if (kycBlock) kycBlock.style.display = 'block';
  }
});
