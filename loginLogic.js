// loginLogic.js — Firebase v9 COMPAT (congruent with your firebaseConfig.js)
import { db, storage } from './firebaseConfig.js';       // compat Firestore & Storage
import { handleConnect } from './connectWallet.js';      // wallet connect (no double-bind)

// ---- Mobile diag logger ----
function diag(msg){
  try{
    const box = document.getElementById('statusBox');
    if (box){
      box.style.display='block';
      const d=document.createElement('div');
      d.textContent=msg;
      box.appendChild(d);
    }
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

  const startBtn     = $('startVolunteeringBtn'); // kept as fallback
  const stopBtn      = $('stopVolunteeringBtn');  // kept as fallback

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
    if (walletDisp)   walletDisp.textContent = addr ? `Wallet: ${short}` : 'Wallet: Not Connected';
    if (walletStatus) walletStatus.textContent = addr ? '✅ Wallet Connected' : 'Wallet not connected';
  };

  const setGating = ({ canStart, canStop, beforeEnabled, afterEnabled }) => {
    startBtn.disabled = !canStart;
    stopBtn.disabled  = !canStop;
    beforeInput.disabled = !beforeEnabled;
    afterInput.disabled  = !afterEnabled;
  };

  async function fetchKycTierAndStatus(addr) {
    try {
      // verifiedKYC/{addr}
      let snap = await db.collection('verifiedKYC').doc(addr).get();
      if (!snap.exists) snap = await db.collection('verifiedKYC').doc(addr.toLowerCase()).get();
      if (snap.exists) {
        const d = snap.data() || {};
        const approved = String(d.status || '').toLowerCase() === 'approved';
        const tier = Number(d.tier ?? (approved ? 2 : 1)) || 1;
        return { tier, approved };
      }
      // users/{addr} (fallback)
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

  async function fetchLiveSyncmPriceUSD() {
    return 0.25; // placeholder
  }

  // ---- Initial UI ----
  if (priceDisp) priceDisp.textContent = 'SYNCM: $0.25 (fixed for now)';
  paintWallet(null);
  if (tierDisp)  tierDisp.textContent = 'Tier: ';
  if (kycStatus) kycStatus.textContent = 'KYC: Check After Connecting Wallet';
  setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });

  // ---- Wallet Connect (single source of truth) ----
  connectBtn.addEventListener('click', async () => {
    const resp = await handleConnect(); // triggers Phantom connect prompt (or other, per your connectWallet.js)
    const addr = resp?.publicKey?.toString?.()
      || window.appWallet?.publicKey
      || window.solana?.publicKey?.toString?.()
      || null;
    if (addr) await onWalletConnected(addr);
  });

  async function onWalletConnected(addr) {
    walletAddress = addr;
    paintWallet(addr);

    // Ensure Auth (compat) is available for Storage rules
    try { await firebase.auth().signInAnonymously(); }
    catch (e) { console.error('Anon auth failed', e); }

    const { tier, approved } = await fetchKycTierAndStatus(addr);
    tierLevel = tier;
    if (tierDisp)  tierDisp.textContent  = `Tier: ${tierLevel}`;
    if (kycStatus) kycStatus.textContent = approved ? 'KYC: ✅ Approved' : 'KYC: ⏳ Pending';

    // Enable BEFORE photo input immediately (lets testers/minors at least log)
    beforeInput.disabled = false;
    beforeInput.removeAttribute('disabled');
    beforeInput.style.pointerEvents = 'auto';
    beforeInput.style.opacity = '1';

    setGating({ canStart:false, canStop:false, beforeEnabled:true, afterEnabled:false });
  }

  // From connectWallet.js (provider events)
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (addr) await onWalletConnected(addr);
  });
  document.addEventListener('wallet:disconnected', () => {
    walletAddress = null;
    paintWallet(null);
    if (tierDisp)  tierDisp.textContent = 'Tier: ';
    if (kycStatus) kycStatus.textContent = 'KYC: Check After Connecting Wallet';
    setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });
  });

  // =========================
  // 🚀 AUTO-START / AUTO-STOP
  // =========================

  // 1) BEFORE photo upload → auto START
  beforeInput.addEventListener('change', async () => {
    const file = beforeInput.files && beforeInput.files[0];
    if (!file) return;

    if (!walletAddress) {
      alert('Please connect your wallet first.');
      beforeInput.value = '';
      return;
    }

    await startFlow(file);  // <— no button click needed
  });

gtag('event', 'volunteering_start', {
  wallet: walletAddress,
  timestamp: new Date().toISOString(),
  geolocation: `${lat},${lng}`
});

  
  // 2) AFTER photo upload → auto STOP
  afterInput.addEventListener('change', async () => {
    const file = afterInput.files && afterInput.files[0];
    if (!file) return;

    if (!sessionStart) {
      alert('No active session found. Please upload a BEFORE photo first.');
      afterInput.value = '';
      return;
    }

    await stopFlow(file);   // <— no button click needed
  });

  // Keep buttons as a fallback (optional)
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
      if (!walletAddress) {
        alert('Please connect your wallet first.');
        return;
      }

      startBtn.disabled = true; // in case user also taps it
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

      // Gate to AFTER only
      setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:true });

      // Friendly confirmation (no extra clicks)
      const locStr = position.latitude
        ? `📍 ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
        : '(no GPS)';
      toast(`You have begun volunteering for Volunteer Coin Project Foundation! ${locStr}`);

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
      if (!sessionStart) {
        alert('No active session found.');
        return;
      }

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
        endTime:   end.toISOString(),
        hours:     +durationHours.toFixed(3),
        tokensEarned: tokens,
        usdValue:  usd,
        startPhotoUrl,
        endPhotoUrl: afterPhotoUrl,
        geolocation: position,
        timestamp: new Date().toISOString()
      });

      if (summaryBox) summaryBox.style.display = 'block';
      if (sessionTimes)  sessionTimes.textContent = `🕒 Start: ${sessionStart.toLocaleString()} | End: ${end.toLocaleString()}`;
      if (tokensEarned)  tokensEarned.textContent = `✅ SYNCM Earned: ${tokens}`;
      if (totalLVBTN)    totalLVBTN.textContent   = `📊 Hourly rate (tier ${tierLevel}): ${hourly} SYNCM/hr`;
      if (usdValue)      usdValue.textContent     = `💰 USD Value (est): $${usd}`;
      if (walletSummary) walletSummary.textContent= `📌 Wallet: ${walletAddress}`;

      if (afterPhotosBox) {
        const img = document.createElement('img');
        img.src = afterPhotoUrl;
        img.alt = 'After Photo';
        img.style.maxWidth = '100%';
        img.style.marginTop = '10px';
        afterPhotosBox.appendChild(img);
      }

      gtag('event', 'volunteering_complete', {
  wallet: walletAddress,
  tokens_earned: sessionTokens,
  usd_value: sessionTokens * 2.5,
  duration_minutes: sessionDuration
});
      // Reset for next time
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

  // ---- If wallet already connected on load ----
  const preAddr = window.appWallet?.publicKey || (window.solana?.publicKey?.toString?.());
  if (preAddr) onWalletConnected(preAddr);
});
