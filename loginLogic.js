// loginLogic.js — Firebase v9 COMPAT (matches your firebaseConfig.js compat exports)
import { db, storage } from './firebaseConfig.js';
import { handleConnect } from './connectWallet.js';

// ---- Mobile diag logger ----
function diag(msg){
  try{
    const box = document.getElementById('statusBox');
    if (box){ box.style.display='block'; const d=document.createElement('div'); d.textContent=msg; box.appendChild(d); }
    console.log('[DIAG]', msg);
  }catch{}
}
diag('loginLogic.js loaded (compat)');

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  // ---- DOM ----
  const connectBtn   = $('connectWalletBtn');
  const walletDisp   = $('walletAddress') || $('walletDisplay');
  const kycStatus    = $('kycStatus');
  const tierDisp     = $('tierInfo');
  const priceDisp    = $('lvbtnPrice');
  const walletStatus = $('walletStatus');

  const beforeInput  = $('beforePhoto');
  const afterInput   = $('afterPhoto');
  const startBtn     = $('startVolunteeringBtn'); // kept (hidden) for fallback
  const stopBtn      = $('stopVolunteeringBtn');  // kept (hidden) for fallback

  const summaryBox   = $('summaryBox');
  const sessionTimes = $('sessionTimes');
  const tokensEarned = $('tokensEarned');
  const totalLVBTN   = $('totalLVBTN');
  const usdValue     = $('usdValue');
  const walletSummary= $('walletSummary');
  const afterPhotosBox = $('afterPhotosBox');

  if (!connectBtn || !beforeInput || !afterInput || !startBtn || !stopBtn) {
    console.error('Missing required DOM elements on this page.');
    return;
  }

  // ---- State ----
  let walletAddress = null;
  let tierLevel = 1;
  let sessionStart = null;
  let startPhotoUrl = null;
  let position = { latitude: null, longitude: null };

  // ---- Helpers ----
  const paintWallet = (addr) => {
    const short = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : '';
    if (walletDisp)   walletDisp.textContent   = addr ? `Wallet: ${short}` : 'Wallet: Not Connected';
    if (walletStatus) walletStatus.textContent = addr ? '✅ Wallet Connected' : 'Wallet not connected';
  };

  const setGating = ({ canStart, canStop, beforeEnabled, afterEnabled }) => {
    startBtn.disabled  = !canStart;
    stopBtn.disabled   = !canStop;
    beforeInput.disabled = !beforeEnabled;
    afterInput.disabled  = !afterEnabled;
    beforeInput.style.opacity = beforeEnabled ? '1' : '0.6';
    afterInput.style.opacity  = afterEnabled ? '1' : '0.6';
  };

  async function fetchKycTierAndStatus(addr) {
    try {
      // Preferred: verifiedKYC/{wallet}
      let snap = await db.collection('verifiedKYC').doc(addr).get();
      if (!snap.exists) snap = await db.collection('verifiedKYC').doc(addr.toLowerCase()).get();
      if (snap.exists) {
        const d = snap.data() || {};
        const approved = String(d.status || '').toLowerCase() === 'approved';
        const tier = Number(d.tier ?? (approved ? 2 : 1)) || 1;
        return { tier, approved };
      }
      // Fallback: users/{wallet}
      const userSnap = await db.collection('users').doc(addr).get();
      if (userSnap.exists) {
        const u = userSnap.data() || {};
        const tier = Number(u.tier ?? 1) || 1;
        const approved = Boolean(u.kycApproved ?? (tier > 1));
        return { tier, approved };
      }
    } catch (e) {
      console.error(e);
    }
    return { tier: 1, approved: false };
  }

  function getHourlySyncm(tier) {
    if (tier >= 3) return 15;
    if (tier === 2) return 10;
    return 5;
  }

  async function getGeolocationWithTimeout(ms = 8000) {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => { if (!done) resolve(null); }, ms);
      navigator.geolocation.getCurrentPosition(
        (pos) => { done = true; clearTimeout(timer); resolve(pos); },
        ()    => { done = true; clearTimeout(timer); resolve(null); },
        { enableHighAccuracy: true, timeout: ms - 1000, maximumAge: 0 }
      );
    });
  }

  async function fetchLiveSyncmPriceUSD() { return 0.25; } // placeholder

  // ---- Initial UI ----
  if (priceDisp) priceDisp.textContent = 'SYNCM: $0.25 (fixed for now)';
  paintWallet(null);
  if (tierDisp) tierDisp.textContent = 'Tier: ';
  if (kycStatus) kycStatus.textContent = 'KYC: Check After Connecting Wallet';
  setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });

  // ---- Wallet Connect (single binder) ----
  connectBtn.addEventListener('click', async () => {
    const resp = await handleConnect(); // Phantom/Solflare connect
    const addr =
      resp?.publicKey?.toString?.() ||
      window.appWallet?.publicKey ||
      window.solana?.publicKey?.toString?.() ||
      null;
    if (addr) await onWalletConnected(addr);
  });

  async function onWalletConnected(addr) {
    walletAddress = addr;
    paintWallet(addr);

    // Ensure Firebase Auth exists (compat) for Storage rules (anonymous ok)
    try { await firebase.auth().signInAnonymously(); } catch (e) { console.error('Anon auth failed', e); }

    const { tier, approved } = await fetchKycTierAndStatus(addr);
    tierLevel = tier;
    if (tierDisp) tierDisp.textContent = `Tier: ${tierLevel}`;
    if (kycStatus) kycStatus.textContent = approved ? 'KYC: ✅ Approved' : 'KYC: ⏳ Pending';

    // Gating:
    // Tier 1: allow “practice” — BEFORE enabled immediately (earnings queued by backend)
    // Tier 2+: require wallet (already connected) to enable BEFORE input
    if (tierLevel < 2) {
      setGating({ canStart:false, canStop:false, beforeEnabled:true, afterEnabled:false });
    } else {
      setGating({ canStart:false, canStop:false, beforeEnabled:true, afterEnabled:false });
    }
  }

  // Provider events from connectWallet.js
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (addr) await onWalletConnected(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    walletAddress = null;
    paintWallet(null);
    if (tierDisp) tierDisp.textContent = 'Tier: ';
    if (kycStatus) kycStatus.textContent = 'KYC: Check After Connecting Wallet';
    setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });
  });

  // =========================
  // 🚀 AUTO-START / AUTO-STOP
  // =========================

  // BEFORE photo upload → auto START
  beforeInput.addEventListener('change', async () => {
    const file = beforeInput.files && beforeInput.files[0];
    if (!file) return;
    if (!walletAddress) { alert('Please connect your wallet first.'); beforeInput.value = ''; return; }
    await startFlow(file);
  });

  // AFTER photo upload → auto STOP
  afterInput.addEventListener('change', async () => {
    const file = afterInput.files && afterInput.files[0];
    if (!file) return;
    if (!sessionStart) { alert('No active session found. Please upload a BEFORE photo first.'); afterInput.value = ''; return; }
    await stopFlow(file);
  });

  // Fallback buttons (kept hidden in UI)
  ['click','touchend'].forEach(evt => startBtn.addEventListener(evt, async (e) => {
    e.preventDefault(); e.stopPropagation();
    const file = beforeInput?.files?.[0];
    if (!file) return alert('Please upload your BEFORE photo.');
    await startFlow(file);
  }, { passive:false }));

  stopBtn.addEventListener('click', async () => {
    const file = afterInput?.files?.[0];
    if (!file) return alert('Please upload your AFTER photo.');
    await stopFlow(file);
  });

  // ---- START FLOW (auto on BEFORE) ----
  async function startFlow(file){
    try {
      if (!walletAddress) { alert('Please connect your wallet first.'); return; }

      startBtn.disabled = true;
      startBtn.textContent = 'Starting…';

      const pos = await getGeolocationWithTimeout(8000);
      if (pos) {
        position.latitude  = pos.coords.latitude;
        position.longitude = pos.coords.longitude;
      }

      const safeAddr = walletAddress.replace(/[^a-zA-Z0-9]/g, '_');
      const bRef = storage.ref(`beforePhotos/${safeAddr}_${Date.now()}.jpg`);
      await bRef.put(file);
      startPhotoUrl = await bRef.getDownloadURL();

      sessionStart = new Date();
      beforeInput.value = '';

      setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:true });

      // Analytics (safe values)
      try {
        const geo = (position.latitude && position.longitude)
          ? `${position.latitude.toFixed(6)},${position.longitude.toFixed(6)}`
          : '(no GPS)';
        window.gtag?.('event', 'volunteering_start', {
          wallet_last4: walletAddress.slice(-4),
          timestamp: sessionStart.toISOString(),
          geolocation: geo
        });
      } catch {}

      toast(`You have begun volunteering for Volunteer Coin Project Foundation!` +
            (position.latitude ? ` 📍 ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : ''));
    } catch (err) {
      console.error('Start volunteering failed', err);
      alert(`Could not start: ${err?.message || err}`);
    } finally {
      startBtn.textContent = 'Start Volunteering';
    }
  }

  // ---- STOP FLOW (auto on AFTER) ----
  async function stopFlow(file){
    try {
      if (!sessionStart) { alert('No active session found.'); return; }
      stopBtn.disabled = true;

      const end = new Date();
      const safeAddr = walletAddress.replace(/[^a-zA-Z0-9]/g, '_');
      const aRef = storage.ref(`afterPhotos/${safeAddr}_${Date.now()}.jpg`);
      await aRef.put(file);
      const afterPhotoUrl = await aRef.getDownloadURL();

      const durationHours = Math.max((end - sessionStart) / 3_600_000, 0.01);
      const hourly = getHourlySyncm(tierLevel);
      const tokens = +(durationHours * hourly).toFixed(2);
      const price  = await fetchLiveSyncmPriceUSD();
      const usd    = +(tokens * price).toFixed(2);

      await db.collection('volunteerSessions').add({
        walletAddress,
        tierLevel,
        startTime: sessionStart.toISOString(),
        endTime: end.toISOString(),
        hours: +durationHours.toFixed(3),
        tokensEarned: tokens,
        usdValue: usd,
        startPhotoUrl,
        endPhotoUrl: afterPhotoUrl,
        geolocation: position,
        timestamp: new Date().toISOString()
      });

      if (summaryBox) summaryBox.style.display = 'block';
      if (sessionTimes) sessionTimes.textContent = `🕒 Start: ${sessionStart.toLocaleString()} | End: ${end.toLocaleString()}`;
      if (tokensEarned) tokensEarned.textContent = `✅ SYNCM Earned: ${tokens}`;
      if (totalLVBTN) totalLVBTN.textContent     = `📊 Hourly rate (tier ${tierLevel}): ${hourly} SYNCM/hr`;
      if (usdValue) usdValue.textContent         = `💰 USD Value (est): $${usd}`;
      if (walletSummary) walletSummary.textContent = `📌 Wallet: ${walletAddress}`;

      if (afterPhotosBox) {
        const img = document.createElement('img');
        img.src = afterPhotoUrl;
        img.alt = 'After Photo';
        img.style.maxWidth = '100%';
        img.style.marginTop = '10px';
        afterPhotosBox.appendChild(img);
      }

      // Analytics (safe)
      try {
        window.gtag?.('event', 'volunteering_complete', {
          wallet_last4: walletAddress.slice(-4),
          tokens_earned: tokens,
          usd_value: usd,
          duration_minutes: +((end - sessionStart)/60000).toFixed(1)
        });
      } catch {}

      // Reset for next session
      afterInput.value = '';
      sessionStart = null;
      startPhotoUrl = null;
      position = { latitude:null, longitude:null };
      setGating({ canStart:false, canStop:false, beforeEnabled:true, afterEnabled:false });

      toast('Session recorded — thank you for serving!');
    } catch (e) {
      console.error('Stop volunteering failed', e);
      alert('Could not finish session. Please try again.');
    } finally {
      stopBtn.disabled = false;
    }
  }

  // ---- tiny toast helper ----
  function toast(msg){
    const t = document.createElement('div');
    t.innerText = msg;
    t.style = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 2500);
  }

  // If wallet already connected on load
  const preAddr = window.appWallet?.publicKey || (window.solana?.publicKey?.toString?.());
  if (preAddr) onWalletConnected(preAddr);
});
