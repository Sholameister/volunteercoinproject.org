// loginLogic.js
import { connectWallet, getWalletAddress, fetchLiveLVBTNPrice } from './connectWallet.js';
import { db, storage, ref, uploadBytes, getDownloadURL } from './firebaseConfig.js';
import { checkKYC, logVolunteerSession } from './kycUtils.js';

// DOM Elements
function readableTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString(); // Returns something like: "7/29/2025, 2:34:56 PM"
}

let walletAddress = null;
let tierLevel = null;
let startTime = null;
let startPhotoUrl = null;
let location = null;

const connectBtn = document.getElementById('connectWalletBtn');
const walletDisplay = document.getElementById('walletAddress');
const beforeInput = document.getElementById('beforePhoto');
const afterInput = document.getElementById('afterPhoto');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const summaryBox = document.getElementById('summaryBox');
const sessionTimes = document.getElementById('sessionTimes');
if (sessionTimes) {
  sessionTimes.textContent = `Started at: ${startTime}`;
} else {
  console.warn("sessionTimes element not found in DOM.");
}
const tokensEarned = document.getElementById('tokensEarned');
const totalLVBTN = document.getElementById('totalLVBTN');
const usdValue = document.getElementById('usdValue');
const photoGallery = document.getElementById('afterPhotosBox');
const priceDisplay = document.getElementById('lvbtnPrice');

// ----- Wallet Connect -----
connectBtn.addEventListener('click', async () => {
  walletAddress = await connectWallet();
  if (!walletAddress) return;

  const tier = await checkKYC(walletAddress);
  tierLevel = tier === "Tier 3" ? 3 : tier === "Tier 2" ? 2 : 1;

  connectBtn.disabled = true;
  beforeInput.disabled = false;
});

// ----- Start Volunteering -----
beforeInput.addEventListener('change', async () => {
  if (!walletAddress) return alert("Connect wallet first.");

  const file = beforeInput.files[0];
  if (!file) return;

  startTime = Date.now();
  const sessionTimes = new Date(startTime).toLocaleString();
  location = await getGeolocation();

  try {
    const photoRef = ref(storage, `beforePhotos/${walletAddress}_${startTime}`);
    await uploadBytes(photoRef, file);
    startPhotoUrl = await getDownloadURL(photoRef);

    beforeInput.disabled = true;
    afterInput.disabled = false;
    showThankYouPopup(startTime, location);

  } catch (err) {
    console.error("❌ Error uploading before photo:", err);
    alert("Photo upload failed.");
  }
});

// ----- Stop Volunteering -----
afterInput.addEventListener('change', async () => {
  const endTime = Date.now();
  const file = afterInput.files[0];
  if (!file) return;

  try {
    const photoRef = ref(storage, `afterPhotos/${walletAddress}_${endTime}`);
    await uploadBytes(photoRef, file);
    const endPhotoUrl = await getDownloadURL(photoRef);

    await logVolunteerSession(walletAddress, tierLevel, startTime, endTime, startPhotoUrl, endPhotoUrl, location);

    renderSessionSummary(startTime, endTime, tierLevel, endPhotoUrl);

    afterInput.disabled = true;
    startBtn.disabled = true;
    stopBtn.disabled = true;

  } catch (err) {
    console.error("❌ Error uploading after photo or logging:", err);
    alert("Session end failed.");
  }
});

// ----- Render Summary -----
async function renderSessionSummary(start, end, tier, endPhotoUrl) {
  const duration = (end - start) / (1000 * 60 * 60);
  const multiplier = tier === 3 ? 1.5 : tier === 2 ? 1.25 : 1;
  const tokens = duration * multiplier;
  const price = await fetchLiveLVBTNPrice();
  const usd = tokens * price;

  sessionTimes.textContent = `Start: ${new Date(start).toLocaleString()} | End: ${new Date(end).toLocaleString()}`;
  tokensEarned.textContent = `LVBTN Earned: ${tokens.toFixed(2)}`;
  usdValue.textContent = `USD Value: $${usd.toFixed(2)}`;

  const newImg = document.createElement('img');
  newImg.src = endPhotoUrl;
  newImg.alt = "After Photo";
  newImg.style.maxWidth = '100px';
  newImg.style.margin = '8px';
  photoGallery.appendChild(newImg);

  summaryBox.style.display = 'block';
}

// ----- Geolocation -----
function getGeolocation() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }),
      () => resolve({ latitude: null, longitude: null })
    );
  });
}

// ----- Thank You -----
function showThankYouPopup(startTime, location) {
  const msg = `You have begun volunteering for the Volunteer Coin Project Foundation!\nTime: ${new Date(startTime).toLocaleTimeString()}\nLocation: ${location.latitude}, ${location.longitude}`;
  alert(msg);
}
