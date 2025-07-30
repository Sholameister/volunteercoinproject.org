// loginLogic.js

// DOM Elements
const connectBtn = document.getElementById('connectWalletBtn');
const walletDisplay = document.getElementById('walletAddress');
const beforeInput = document.getElementById('beforePhoto');
const afterInput = document.getElementById('afterPhoto');
const summaryBox = document.getElementById('summaryBox');
const sessionTimes = document.getElementById('sessionTimes');
const tokensEarned = document.getElementById('tokensEarned');
const totalLVBTN = document.getElementById('totalLVBTN');
const usdValue = document.getElementById('usdValue');
const photoGallery = document.getElementById('afterPhotosBox');
const priceDisplay = document.getElementById('lvbtnPrice');

let walletAddress = null;
let tierLevel = null;
let startTime = null;
let startPhotoUrl = null;
let location = null;

// ----- Connect Wallet -----
connectBtn.addEventListener('click', async () => {
  if (!window.connectWallet) return alert("Wallet script not loaded.");
  walletAddress = await window.connectWallet();
  if (!walletAddress) return;

  if (!window.checkKYC) return alert("KYC check function not loaded.");
  const tier = await window.checkKYC(walletAddress);
  tierLevel = tier === "Tier 3" ? 3 : tier === "Tier 2" ? 2 : 1;

  connectBtn.disabled = true;
  beforeInput.disabled = false;
  walletDisplay.textContent = walletAddress;
});

// ----- Start Volunteering -----
beforeInput.addEventListener('change', async () => {
  if (!walletAddress) return alert("Connect wallet first.");
  const file = beforeInput.files[0];
  if (!file) return;

  startTime = new Date().toISOString();
  location = await getGeolocation();

  try {
    const photoRef = window.storage.ref(`beforePhotos/${walletAddress}_${startTime}`);
    await photoRef.put(file);
    startPhotoUrl = await photoRef.getDownloadURL();

    beforeInput.disabled = true;
    afterInput.disabled = false;
    showThankYouPopup(startTime, location);
  } catch (err) {
    console.error("❌ Error uploading before photo:", err);
    alert("Before photo upload failed.");
  }
});

// ----- Stop Volunteering -----
afterInput.addEventListener('change', async () => {
  const endTime = new Date().toISOString();
  const file = afterInput.files[0];
  if (!file) return;

  try {
    const photoRef = window.storage.ref(`afterPhotos/${walletAddress}_${endTime}`);
    await photoRef.put(file);
    const endPhotoUrl = await photoRef.getDownloadURL();

    if (!window.logVolunteerSession) {
      alert("Session logging function not loaded.");
      return;
    }

    await window.logVolunteerSession(
      walletAddress,
      tierLevel,
      startTime,
      endTime,
      startPhotoUrl,
      endPhotoUrl,
      location
    );

    renderSessionSummary(startTime, endTime, tierLevel, endPhotoUrl);
    afterInput.disabled = true;
  } catch (err) {
    console.error("❌ Error uploading after photo or logging session:", err);
    alert("Session end failed.");
  }
});

// ----- Summary Display -----
async function renderSessionSummary(start, end, tier, endPhotoUrl) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const duration = (endDate - startDate) / (1000 * 60 * 60); // in hours
  const multiplier = tier === 3 ? 1.5 : tier === 2 ? 1.25 : 1;
  const tokens = duration * multiplier;

  // If fetchLiveLVBTNPrice() exists, use it, otherwise fallback to 2.5
  let price = 2.5;
  try {
    price = await window.fetchLiveLVBTNPrice?.() || 2.5;
  } catch (e) {}

  const usd = tokens * price;

  sessionTimes.textContent = `Start: ${startDate.toLocaleString()} | End: ${endDate.toLocaleString()}`;
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
