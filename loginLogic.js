// loginLogic.js — session gating + uploads + Firestore log (ESM)

import { handleConnect } from './connectWallet.js';
import { db, storage } from './firebaseConfig.js';

// Firestore (modular CDN OK)
import {
  doc, getDoc, collection, addDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Storage (modular CDN OK)
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

// ---- Guard: only run on login page if the key elements exist ----
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const connectBtn   = $('connectWalletBtn');
  const walletDisp   = $('walletAddress') || $('walletDisplay');
  const kycStatus    = $('kycStatus');
  const tierDisp     = $('tierInfo');
  const priceDisp    = $('lvbtnPrice'); // we'll show SYNCM label
  const walletStatus = $('walletStatus');

  const beforeInput  = $('beforePhoto');
  const afterInput   = $('afterPhoto');
  const startBtn     = $('startVolunteeringBtn');
  const stopBtn      = $('stopVolunteeringBtn');

  const summaryBox   = $('summaryBox');
  const sessionTimes = $('sessionTimes');
  const tokensEarned = $('tokensEarned');
  const totalLVBTN   = $('totalLVBTN');
  const usdValue     = $('usdValue');
  const walletSummary= $('walletSummary');
  const afterPhotosBox = $('afterPhotosBox');

  // If the core controls aren't on the page, bail out quietly
  if (!connectBtn || !beforeInput || !afterInput || !startBtn || !stopBtn) return;

  // ---------- State ----------
  let walletAddress = null;
  let tierLevel = 1;
  let sessionStart = null;
  let startPhotoUrl = null;
  let position = { latitude: null, longitude: null };

  // ---------- Helpers ----------
  async function fetchTierLevel(addr) {
    try {
      const userRef = doc(db, 'users', addr);
      const snap = await getDoc(userRef);
      return snap.exists() ? (snap.data().tier ?? 1) : 1;
    } catch (e) {
      console.error('fetchTierLevel failed:', e);
      return 1;
    }
  }

  function getHourlySyncm(tier) {
    if (tier === 3) return 15;   // SYNCM/hr (Tier 3)
    if (tier === 2) return 10;   // SYNCM/hr (Tier 2)
    return 5;                    // SYNCM/hr (Tier 1)
  }

  async function getGeolocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          position.latitude  = pos.coords.latitude;
          position.longitude = pos.coords.longitude;
          resolve();
        },
        (err) => reject(err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    });
  }

  // Placeholder until you wire a real live price; internal $0.25 for SYNCM
  async function fetchLiveSyncmPriceUSD() {
    return 0.25;
  }

  function paintWallet(addr) {
    const short = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : '';
    if (walletDisp)   walletDisp.textContent = addr ? `Wallet: ${short}` : 'Wallet: Not Connected';
    if (walletStatus) walletStatus.textContent = addr ? '✅ Wallet Connected' : 'Wallet not connected';
  }

  function setGating({ canStart, canStop, beforeEnabled, afterEnabled }) {
    if (startBtn)   startBtn.disabled   = !canStart;
    if (stopBtn)    stopBtn.disabled    = !canStop;
    if (beforeInput)beforeInput.disabled= !beforeEnabled;
    if (afterInput) afterInput.disabled = !afterEnabled;
  }

  // ---------- Initial UI ----------
  if (priceDisp) priceDisp.textContent = 'SYNCM: $0.25 (fixed for now)';
  paintWallet(null);
  if (tierDisp)  tierDisp.textContent = 'Tier: ';
  if (kycStatus) kycStatus.textContent = 'KYC: Check After Connecting Wallet';
  setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });

  // ---------- Wallet Connect ----------
  connectBtn.addEventListener('click', async () => {
    const resp = await handleConnect(); // opens Phantom; sets window.appWallet; fires events
    const addr = resp?.publicKey?.toString?.() || window.appWallet?.publicKey || null;
    if (!addr) return; // user cancelled
    await onWalletConnected(addr);
  });

  async function onWalletConnected(addr) {
    walletAddress = addr;
    paintWallet(addr);

    // Load tier + show statuses
    tierLevel = await fetchTierLevel(addr);
    if (tierDisp)  tierDisp.textContent  = `Tier: ${tierLevel}`;
    if (kycStatus) kycStatus.textContent = tierLevel > 1 ? 'KYC: ✅ Approved' : 'KYC: ⏳ Pending';

    // Allow BEFORE photo now that wallet is connected
    setGating({ canStart:false, canStop:false, beforeEnabled:true, afterEnabled:false });
  }

  // React to global wallet events (e.g., account switch, reconnect)
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (!addr) return;
    await onWalletConnected(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    walletAddress = null;
    paintWallet(null);
    if (tierDisp)  tierDisp.textContent  = 'Tier: ';
    if (kycStatus) kycStatus.textContent = 'KYC: Check After Connecting Wallet';
    setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });
  });

  // ---------- Photo change → enable buttons at the right time ----------
  beforeInput.addEventListener('change', () => {
    // Enable Start only when wallet is connected AND before photo chosen
    const ok = !!walletAddress && beforeInput.files && beforeInput.files[0];
    setGating({
      canStart: ok,
      canStop: false,
      beforeEnabled: true,
      afterEnabled: false
    });
  });

  afterInput.addEventListener('change', () => {
    // Enable Stop only during an active session and after after-photo chosen
    const ok = !!sessionStart && afterInput.files && afterInput.files[0];
    setGating({
      canStart: false,
      canStop: ok,
      beforeEnabled: false,
      afterEnabled: true
    });
  });

  // ---------- Start Volunteering ----------
  startBtn.addEventListener('click', async () => {
    try {
      const file = beforeInput?.files?.[0];
      if (!walletAddress) { alert('Please connect your wallet first.'); return; }
      if (!file) { alert('Please upload your BEFORE photo.'); return; }

      await getGeolocation();

      const safeAddr = walletAddress.replace(/[^a-zA-Z0-9]/g, '_');
      const bRef = storageRef(storage, `beforePhotos/${safeAddr}_${Date.now()}`);
      await uploadBytes(bRef, file);
      startPhotoUrl = await getDownloadURL(bRef);

      sessionStart = new Date();
      // After starting: freeze before, unlock after
      beforeInput.value = '';
      setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:true });

      alert(`✅ Volunteering started!\n📍 ${position.latitude?.toFixed?.(6)}, ${position.longitude?.toFixed?.(6)}`);
    } catch (e) {
      console.error('Start volunteering failed', e);
      alert('Could not start volunteering. Check permissions (location/photos).');
    }
  });

  // ---------- Stop Volunteering ----------
  stopBtn.addEventListener('click', async () => {
    try {
      if (!sessionStart) { alert('No active session found.'); return; }
      const file = afterInput?.files?.[0];
      if (!file) { alert('Please upload your AFTER photo.'); return; }

      const end = new Date();

      const safeAddr = walletAddress.replace(/[^a-zA-Z0-9]/g, '_');
      const aRef = storageRef(storage, `afterPhotos/${safeAddr}_${Date.now()}`);
      await uploadBytes(aRef, file);
      const afterPhotoUrl = await getDownloadURL(aRef);

      const durationHours = Math.max((end - sessionStart) / 3_600_000, 0.01);

      // Token math: SYNCM per hour by tier (5/10/15).
      const hourly = getHourlySyncm(tierLevel);
      const tokens = +(durationHours * hourly).toFixed(2);

      // Dollar value (placeholder)
      const price = await fetchLiveSyncmPriceUSD();
      const usd = +(tokens * price).toFixed(2);

      await addDoc(collection(db, 'volunteerSessions'), {
        walletAddress,
        tierLevel,
        startTime: sessionStart.toISOString(),
        endTime: end.toISOString(),
        hours: +durationHours.toFixed(3),
        tokensEarned: tokens,           // SYNCM earned this session
        usdValue: usd,
        startPhotoUrl,
        endPhotoUrl: afterPhotoUrl,
        geolocation: position,
        timestamp: new Date().toISOString()
      });

      // Render summary
      if (summaryBox) summaryBox.style.display = 'block';
      if (sessionTimes) sessionTimes.textContent = `🕒 Start: ${sessionStart.toLocaleString()} | End: ${end.toLocaleString()}`;
      if (tokensEarned) tokensEarned.textContent = `✅ SYNCM Earned: ${tokens}`;
      if (totalLVBTN) totalLVBTN.textContent = `📊 Hourly rate (tier ${tierLevel}): ${hourly} SYNCM/hr`;
      if (usdValue) usdValue.textContent = `💰 USD Value (est): $${usd}`;
      if (walletSummary) walletSummary.textContent = `📌 Wallet: ${walletAddress}`;

      if (afterPhotosBox) {
        const img = document.createElement('img');
        img.src = afterPhotoUrl;
        img.alt = 'After Photo';
        img.style.maxWidth = '100%';
        img.style.marginTop = '10px';
        afterPhotosBox.appendChild(img);
      }

      // Reset gating after end
      afterInput.value = '';
      setGating({ canStart:false, canStop:false, beforeEnabled:false, afterEnabled:false });

    } catch (e) {
      console.error('Stop volunteering failed', e);
      alert('Could not finish session. Please try again.');
    }
  });

  // ---------- If already connected on load (returning visitor) ----------
  const preAddr = window.appWallet?.publicKey || (window.solana?.publicKey?.toString?.());
  if (preAddr) {
    onWalletConnected(preAddr);
  }
});
