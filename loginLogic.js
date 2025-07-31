import { connectWallet, getWalletAddress, fetchLiveLVBTNPrice } from './connectWallet.js';
import { db, storage } from './firebaseConfig.js';
import { updateKycDom } from './kycUtils.js';

let dashboardWallet = null;
let tierLevel = null;
let sessionStart = null;
let startPhotoUrl = null;
let position = { latitude: null, longitude: null };

// DOM Elements
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

// ---- Fetch Tier Level ----
async function fetchTierLevel(addr) {
  const doc = await db.collection('users').doc(addr).get();
  return doc.exists ? doc.data().tier || 1 : 1;
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

document.addEventListener('DOMContentLoaded', () => {
  if (!connectBtn) {
    console.error('❌ connectWalletBtn not found!');
    return;
  }

  connectBtn.addEventListener('click', async () => {
    walletAddress = await connectWallet();
    if (!walletAddress) return;

    walletDisplay.textContent = `Wallet: ${walletAddress}`;
    tierLevel = await fetchTierLevel(walletAddress);
    tierDisplay.textContent = `Tier: ${tierLevel}`;
    kycStatus.textContent = 'KYC: ✅ Approved';

    beforeInput.disabled = false;
    walletStatus.textContent = `✅ Wallet Connected`;

    const price = await fetchLiveLVBTNPrice();
    priceDisplay.textContent = `LVBTN Price: $${price.toFixed(2)}`;
  });
});


// ---- Start Volunteering ----
const startBtn = document.getElementById('startVolunteeringBtn');
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
} else {
  console.warn('startVolunteeringBtn not found in Dom');
}


// ---- Stop Volunteering ----
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
    timestamp: window.serverTime
  });

  summaryBox.style.display = 'block';
  sessionTimes.textContent = `🕒 Start: ${sessionStart.toLocaleString()} | End: ${end.toLocaleString()}`;
  tokensEarned.textContent = `✅ LVBTN Earned: ${tokens}`;
  totalLVBTN.textContent = `📊 Tier Multiplier: x${multiplier}`;
  usdValue.textContent = `💰 USD Value: $${usd}`;
  walletSummary.textContent = `📌 Wallet: ${walletAddress}`;

  const img = document.createElement('img');
  img.src = afterPhotoUrl;
  afterPhotosBox.appendChild(img);

  afterInput.disabled = true;
  stopBtn.disabled = true;
});
