// loginLogic.js — modular v9, root-relative imports

import { connectWallet } from './connectWallet.js';
import { db, storage } from './firebaseConfig.js';

// Firestore (modular)
import {
  doc, getDoc, collection, addDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Storage (modular)
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

// ---- Guard: only run on login.html ----
if (!location.pathname.includes('login.html')) {
  // not on login page; do nothing
} else {

  let walletAddress = null;
  let tierLevel = 1;
  let sessionStart = null;
  let startPhotoUrl = null;
  let position = { latitude: null, longitude: null };

  async function fetchTierLevel(addr) {
    try {
      const userRef = doc(db, 'users', addr);
      const snap = await getDoc(userRef);
      return snap.exists() ? (snap.data().tier || 1) : 1;
    } catch (e) {
      console.error('fetchTierLevel failed:', e);
      return 1;
    }
  }

  function getMultiplier(tier) {
    if (tier === 3) return 1.5;
    if (tier === 2) return 1.25;
    return 1;
  }

  function getGeolocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          position.latitude = pos.coords.latitude;
          position.longitude = pos.coords.longitude;
          resolve();
        },
        (err) => reject(err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    });
  }

  // placeholder until you wire a live price
  async function fetchLiveLVBTNPrice() { return 1; }

  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    const connectBtn   = $('connectWalletBtn');
    const walletDisp   = $('walletAddress') || $('walletDisplay');
    const kycStatus    = $('kycStatus');
    const tierDisp     = $('tierInfo');
    const priceDisp    = $('lvbtnPrice');
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

    if (window?.phantom?.solana?.isPhantom || window?.solana?.isPhantom) {
      if (walletStatus) walletStatus.innerText = '✅ Phantom Wallet Detected. You can connect anytime.';
      if (connectBtn) connectBtn.style.display = 'inline-block';
    } else {
      if (walletStatus) walletStatus.innerText = '👋 You can explore without connecting your wallet.';
      if (connectBtn) connectBtn.style.display = 'none';
    }

    // Wallet Connect
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        try {
          walletAddress = await connectWallet();
          if (!walletAddress) return;

          if (walletDisp) walletDisp.textContent = `Wallet: ${walletAddress}`;
          if (walletStatus) walletStatus.textContent = '✅ Wallet Connected';
          tierLevel = await fetchTierLevel(walletAddress);
          if (tierDisp) tierDisp.textContent = `Tier: ${tierLevel}`;
          if (kycStatus) kycStatus.textContent = 'KYC: ✅ Approved';
          if (beforeInput) beforeInput.disabled = false;
        } catch (err) {
          console.error('Wallet connect / KYC failed', err);
          alert('Something went wrong while connecting your wallet.');
        }
      });
    }

    // Start Volunteering
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        try {
          const file = beforeInput?.files?.[0];
          if (!file || !walletAddress) {
            alert('Please upload your BEFORE photo and connect your wallet.');
            return;
          }
          await getGeolocation();

          const bRef = storageRef(storage, `beforePhotos/${walletAddress}_${Date.now()}`);
          await uploadBytes(bRef, file);
          startPhotoUrl = await getDownloadURL(bRef);

          sessionStart = new Date();
          if (beforeInput) beforeInput.disabled = true;
          if (afterInput) afterInput.disabled = false;
          if (startBtn) startBtn.disabled = true;
          if (stopBtn)  stopBtn.disabled = false;

          alert(`✅ Volunteering started!\n📍 ${position.latitude}, ${position.longitude}`);
        } catch (e) {
          console.error('Start volunteering failed', e);
          alert('Could not start volunteering. Check permissions (location/photos).');
        }
      });
    }

   if (stopBtn) {
  stopBtn.addEventListener('click', async () => {
    try {
      const end = new Date();
      const file = afterInput?.files?.[0];
      if (!file || !sessionStart) {
        alert('Please upload your AFTER photo.');
        return;
      }

      const aRef = storageRef(storage, `afterPhotos/${walletAddress}_${Date.now()}`);
      await uploadBytes(aRef, file);
      const afterPhotoUrl = await getDownloadURL(aRef);

      const durationHours = Math.max((end - sessionStart) / 3_600_000, 0.01);
      const multiplier = getMultiplier(tierLevel);
      const tokens = +(durationHours * multiplier).toFixed(2);

      const price = await fetchLiveLVBTNPrice();
      const usd = +(tokens * price).toFixed(2);

      await addDoc(collection(db, 'volunteerSessions'), {
        walletAddress,
        tierLevel,
        startTime: sessionStart.toISOString(),
        endTime: end.toISOString(),
        tokensEarned: tokens,
        usdValue: usd,
        startPhotoUrl,
        endPhotoUrl: afterPhotoUrl,
        geolocation: position,
        timestamp: new Date().toISOString()
      });

      if (summaryBox) summaryBox.style.display = 'block';
      if (sessionTimes) sessionTimes.textContent = `🕒 Start: ${sessionStart.toLocaleString()} | End: ${end.toLocaleString()}`;
      if (tokensEarned) tokensEarned.textContent = `✅ LVBTN Earned: ${tokens}`;
      if (totalLVBTN) totalLVBTN.textContent = `📊 Tier Multiplier: x${multiplier}`;
      if (usdValue) usdValue.textContent = `💰 USD Value: $${usd}`;
      if (walletSummary) walletSummary.textContent = `📌 Wallet: ${walletAddress}`;

      if (afterPhotosBox) {
        const img = document.createElement('img');
        img.src = afterPhotoUrl;
        img.alt = 'After Photo';
        img.style.maxWidth = '100%';
        img.style.marginTop = '10px';
        afterPhotosBox.appendChild(img);
      }

      if (afterInput) afterInput.disabled = true;
      if (stopBtn) stopBtn.disabled = true;

    } catch (e) {
      console.error('Stop volunteering failed', e);
      alert('Could not finish session. Please try again.');
    }
  });
}