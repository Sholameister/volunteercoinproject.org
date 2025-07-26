// Firebase
const db = firebase.firestore();
const storage = firebase.storage();

// Globals
let walletAddress = null;
let tierLevel = null;
let sessionStart = null;
let startPhotoUrl = null;
let position = { latitude: null, longitude: null };

// DOM Elements
const connectBtn = document.getElementById('connectWalletBtn');
const walletDisplay = document.getElementById('walletAddress');
const kycStatus = document.getElementById('kycStatus');
const tierDisplay = document.getElementById('tierInfo');
const beforeInput = document.getElementById('beforePhoto');
const afterInput = document.getElementById('afterPhoto');
const summaryBox = document.getElementById('summaryBox');
const sessionTimes = document.getElementById('sessionTimes');
const tokensEarned = document.getElementById('tokensEarned');
const totalLVBTN = document.getElementById('totalLVBTN');
const usdValue = document.getElementById('usdValue');
const priceDisplay = document.getElementById('lvbtnPrice');
const photoGallery = document.getElementById('photoGallery');
const afterPhotosBox = document.getElementById('afterPhotosBox');

// Founder whitelist
const founderWhitelist = [
  "HwTjV2Bv1ftQXZENfR3S72T4AbA1EHnWAm8R1ViksTkq",
  "5z4Q4mjxJ5W3wMGVxXQbPX79a89XJr5BVEfXA7djqFSF",
  "3mNLv5BpWy1hWSu63ojrUaJMoNSegQQxfAE3G6WZ6pQk",
  "67zgjSeu8PKwry1m9w9vUcrNJ6ca3hxjxKuspVBvUkui",
  "7Li42fFk94nnSsSZjqP4ZFrqoiVzsBb4frFLHP2SdCPR",
  "2z12gYEncLue4YHsHMtit8fXKiWVEF9iotMtuvWmNSg5",
  "yepqk5FdpQbYXkAUgBGe7g79a1X26yaogdXratjBFnU",
  "9m3cPENmcDqYVew7V63zxEDFuydP5EDERpkDNmopNuFc",
  "3zBg3uqPHuvmwrVvfkHvzcsHpV5kUfwMntLvdDLq2X8n",
  "ADctJurWjaUnmQHMjtCr2ueb9jQHbdYzJFk51aphcBds",
  "CpPfAz8qfHUghkFXAkqPLZHJZq5sut9V2fENy1hE54XD",
  "BbQwsu2eRuMZnY836FQMCGepFPyAJe2bXGxPr5J5HLbf",
  "GdqQ2tJY1ddqFpbge6vMzneXdHFacZgpsukRp2vTLf8w",
  "Ex4dRbZZuo6T4Wms1eaZkG6g88WpRCTRmMmz5ppEQgrz",
];

// Connect Phantom Wallet
connectBtn.addEventListener('click', async () => {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom Wallet not found!");
    return;
  }

  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    walletDisplay.innerText = `Wallet: ${walletAddress}`;
    await checkKYC(walletAddress);
  } catch (err) {
    console.error("Wallet connect error:", err);
    alert("Failed to connect Phantom wallet.");
  }
});

// Check KYC + Tier
async function checkKYC(wallet) {
  if (founderWhitelist.includes(wallet)) {
    kycStatus.innerText = "✅ Founder Access Granted";
    tierLevel = 3;
    tierDisplay.innerText = `Tier 3 (Founder Override) – 1.5 LVBTN/hr`;
    updateProgressBar(tierLevel);
    beforeInput.disabled = false;
    return;
  }

  try {
    const doc = await db.collection("users").doc(wallet).get();
    if (!doc.exists || !doc.data().kycApproved) {
      kycStatus.innerText = "❌ KYC not approved";
      tierDisplay.innerText = "Tier: N/A";
      return;
    }

    const userData = doc.data();
    tierLevel = userData.tier || 1;
    kycStatus.innerText = "✅ KYC Approved";
    tierDisplay.innerText = `Tier ${tierLevel} (${getTierName(tierLevel)}) – ${getTierMultiplier(tierLevel)} LVBTN/hr`;
    updateProgressBar(tierLevel);
    logTier(wallet, tierLevel);
    beforeInput.disabled = false;
  } catch (err) {
    console.error("Error checking KYC:", err);
    kycStatus.innerText = "❌ Error checking KYC";
  }
}

function getTierName(tier) {
  switch (tier) {
    case 1: return "Starter";
    case 2: return "Driver";
    case 3: return "Elite Volunteer";
    default: return "Unknown";
  }
}

function getTierMultiplier(tier) {
  switch (tier) {
    case 1: return 1.0;
    case 2: return 1.25;
    case 3: return 1.5;
    default: return 1.0;
  }
}

async function logTier(wallet, tier) {
  await db.collection("sessionTracking").doc(wallet).set({
    wallet,
    tier,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Start Volunteering
beforeInput.addEventListener('change', async () => {
  const file = beforeInput.files[0];
  if (!file || !walletAddress) return;

  try {
    const ref = storage.ref(`volunteerPhotos/${walletAddress}/before_${Date.now()}.jpg`);
    const snap = await ref.put(file);
    startPhotoUrl = await snap.ref.getDownloadURL();

    sessionStart = new Date();
    position = await getGeolocation();

    alert(`Thank you for volunteering!\nStart: ${sessionStart.toLocaleString()}\nLocation: ${position.latitude}, ${position.longitude}`);

    beforeInput.disabled = true;
    afterInput.disabled = false;

    await db.collection("volunteerSessions").doc(`${walletAddress}_${sessionStart.getTime()}`).set({
      wallet: walletAddress,
      tier: tierLevel,
      startTime: firebase.firestore.Timestamp.fromDate(sessionStart),
      startLocation: position,
      startPhoto: startPhotoUrl
    });
  } catch (err) {
    console.error("Start photo upload error:", err);
    alert("Failed to upload start photo.");
  }
});

// Stop Volunteering
afterInput.addEventListener('change', async () => {
  const file = afterInput.files[0];
  if (!file || !walletAddress || !sessionStart) return;

  const sessionEnd = new Date();
  const durationHours = (sessionEnd - sessionStart) / (1000 * 60 * 60);
  const multiplier = getTierMultiplier(tierLevel);
  const tokensThisSession = parseFloat((durationHours * multiplier).toFixed(2));
  let afterPhotoUrl = "";

  try {
    const ref = storage.ref(`volunteerPhotos/${walletAddress}/after_${Date.now()}.jpg`);
    const snap = await ref.put(file);
    afterPhotoUrl = await snap.ref.getDownloadURL();
  } catch (err) {
    console.error("After photo upload error:", err);
    alert("Failed to upload after photo.");
    return;
  }

  const docId = `${walletAddress}_${sessionStart.getTime()}`;
  await db.collection("volunteerSessions").doc(docId).update({
    endTime: firebase.firestore.Timestamp.fromDate(sessionEnd),
    duration: durationHours,
    tokensEarned: tokensThisSession,
    afterPhoto: afterPhotoUrl
  });

  const totalTokens = await getTotalTokens(walletAddress);
  const livePrice = await fetchLVBTNPrice();
  const usd = (totalTokens * livePrice).toFixed(2);

  sessionTimes.innerText = `Started: ${sessionStart.toLocaleString()} | Ended: ${sessionEnd.toLocaleString()}`;
  tokensEarned.innerText = `Session Tokens: ${tokensThisSession}`;
  totalLVBTN.innerText = `Total LVBTN: ${totalTokens}`;
  usdValue.innerText = `USD Value: $${usd}`;
  priceDisplay.innerText = `Live LVBTN Price: $${livePrice}`;

  summaryBox.style.display = 'block';
  await loadAfterPhotos();

  const link = document.createElement('a');
  link.href = 'volunteer-hours.html';
  link.innerText = '📋 View Full Volunteer History';
  link.style.display = 'block';
  link.style.marginTop = '10px';
  link.style.textAlign = 'center';
  summaryBox.appendChild(link);
});

async function getTotalTokens(wallet) {
  const query = await db.collection("volunteerSessions").where("wallet", "==", wallet).get();
  let total = 0;
  query.forEach(doc => {
    total += doc.data().tokensEarned || 0;
  });
  return parseFloat(total.toFixed(2));
}

async function fetchLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lovebutton&vs_currencies=usd");
    const data = await res.json();
    return data.lovebutton?.usd || 2.50;
  } catch {
    return 2.50;
  }
}

async function loadAfterPhotos() {
  const query = await db.collection("volunteerSessions").where("wallet", "==", walletAddress).get();
  if (query.empty) return;

  photoGallery.innerHTML = "";
  afterPhotosBox.style.display = 'block';

  query.forEach(doc => {
    const data = doc.data();
    if (data.afterPhoto) {
      const img = document.createElement("img");
      img.src = data.afterPhoto;
      img.className = "after-photo";
      photoGallery.appendChild(img);
    }
  });
}

async function getGeolocation() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({ latitude: null, longitude: null })
    );
  });
}

// Progress bar helper
function updateProgressBar(tier) {
  const progress = document.createElement("progress");
  progress.max = 3;
  progress.value = tier;
  progress.style.width = "80%";
  progress.style.marginTop = "10px";
  tierDisplay.appendChild(progress);
}
