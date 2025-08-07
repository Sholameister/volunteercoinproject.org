
import { connectWallet, getWalletAddress, fetchLiveLVBTNPrice } from '/js/connectWallet.js';
import { fetchBlockedWallets, updateKycDom } from '/js/kycUtils.js';
import { db, storage } from '/js/firebaseConfig.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Guard clause if not on login.html
if (!window.location.pathname.includes('login.html')) {
  console.log('ℹ️ loginLogic.js loaded but skipped — not on login.html');
}

// Globals
let walletAddress = null;
let tierLevel = null;
let sessionStart = null;
let startPhotoUrl = null;
let position = { latitude: null, longitude: null };

// Fetch Tier Level
async function fetchTierLevel(addr) {
  try {
    const userRef = doc(db, 'users', addr);
    const docSnap = await getDoc(userRef);
    return docSnap.exists() ? docSnap.data().tier || 1 : 1;
  } catch (err) {
    console.error('Failed to fetch tier level:', err);
    return 1;
  }


function getMultiplier(tier) {
  if (tier === 3) return 1.5;
  if (tier === 2) return 1.25;
  return 1;
}

function getGeolocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        position.latitude = pos.coords.latitude;
        position.longitude = pos.coords.longitude;
        resolve();
      },
      reject,
      { enableHighAccuracy: true }
    );
  });
}

// ---- Main Logic ----
document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWalletBtn');
  const walletDisplay = document.getElementById('walletAddress');
  const kycStatus = document.getElementById('kycStatus');
  const tierDisplay = document.getElementById('tierInfo');
  const priceDisplay = document.getElementById('lvbtnPrice');
  const walletStatus = document.getElementById('walletStatus');
  const beforeInput = document.getElementById('beforePhoto');
  const afterInput = document.getElementById('afterPhoto');
  const startBtn = document.getElementById('startVolunteeringBtn');
  const stopBtn = document.getElementById('stopVolunteeringBtn');
  const summaryBox = document.getElementById('summaryBox');
  const sessionTimes = document.getElementById('sessionTimes');
  const tokensEarned = document.getElementById('tokensEarned');
  const totalLVBTN = document.getElementById('totalLVBTN');
  const usdValue = document.getElementById('usdValue');
  const walletSummary = document.getElementById('walletSummary');
  const afterPhotosBox = document.getElementById('afterPhotosBox');

  if (window.solana && window.solana.isPhantom) {
    walletStatus.innerText = "✅ Phantom Wallet Detected. You can connect anytime.";
    connectBtn.style.display = 'inline-block';
  } else {
    walletStatus.innerText = "👋 You can explore without connecting your wallet.";
    connectBtn.style.display = 'none';
  }

  // Wallet Connect
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        walletAddress = await connectWallet();
        if (!walletAddress) return;

        const blockedWallets = await fetchBlockedWallets();
        if (blockedWallets.includes(walletAddress)) {
          alert("🚫 This wallet is blocked.");
          document.body.innerHTML = '<h2 style="color:red;text-align:center;">Access Denied. Blocked Wallet.</h2>';
          throw new Error("Blocked wallet attempted access.");
        }

        walletDisplay.textContent = `Wallet: ${walletAddress}`;
        walletStatus.textContent = `✅ Wallet Connected`;
        tierLevel = await fetchTierLevel(walletAddress);
        tierDisplay.textContent = `Tier: ${tierLevel}`;
        kycStatus.textContent = 'KYC: ✅ Approved';
        beforeInput.disabled = false;
      } catch (err) {
        console.error("❌ Wallet connection or KYC failed", err);
        alert("Something went wrong while connecting your wallet.");
      }
    });
  }

  // Start Volunteering
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      const file = beforeInput.files[0];
      if (!file || !walletAddress) return alert("Please upload your before photo and connect your wallet.");

      await getGeolocation();

      const fileRef = storage.ref(`beforePhotos/${walletAddress}_${Date.now()}`);
      const snapshot = await fileRef.put(file);
      startPhotoUrl = await snapshot.ref.getDownloadURL();

      sessionStart = new Date();
      beforeInput.disabled = true;
      afterInput.disabled = false;
      startBtn.disabled = true;
      stopBtn.disabled = false;

      alert(`✅ You have begun volunteering!\n📍 Location: ${position.latitude}, ${position.longitude}`);
    });
  }

  // Stop Volunteering
  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      const end = new Date();
      const file = afterInput.files[0];
      if (!file || !sessionStart) return alert("Please upload your after photo.");

      const fileRef = storage.ref(`afterPhotos/${walletAddress}_${Date.now()}`);
      const snapshot = await fileRef.put(file);
      const afterPhotoUrl = await snapshot.ref.getDownloadURL();

      const durationMs = end - sessionStart;
      const durationHours = Math.max(durationMs / 3600000, 0.01);
      const multiplier = getMultiplier(tierLevel);
      const tokens = +(durationHours * multiplier).toFixed(2);

      const price = await fetchLiveLVBTNPrice();
      const usd = +(tokens * price).toFixed(2);

      await db.collection('volunteerSessions').add({
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

      summaryBox.style.display = 'block';
      sessionTimes.textContent = `🕒 Start: ${sessionStart.toLocaleString()} | End: ${end.toLocaleString()}`;
      tokensEarned.textContent = `✅ LVBTN Earned: ${tokens}`;
      totalLVBTN.textContent = `📊 Tier Multiplier: x${multiplier}`;
      usdValue.textContent = `💰 USD Value: $${usd}`;
      walletSummary.textContent = `📌 Wallet: ${walletAddress}`;

      const img = document.createElement('img');
      img.src = afterPhotoUrl;
      img.alt = 'After Photo';
      img.style.maxWidth = '100%';
      img.style.marginTop = '10px';
      afterPhotosBox.appendChild(img);

      afterInput.disabled = true;
      stopBtn.disabled = true;
    });
  }
});

