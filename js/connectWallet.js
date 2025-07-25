// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

// Firebase
firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const storage = firebase.storage();

let walletAddress = null;
let tierLevel = null;
let sessionStart = null;
let startPhotoUrl = null;

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
const progressBar = document.getElementById('progressBar');

// Solana Wallet Adapter
async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    walletDisplay.innerText = `Wallet: ${walletAddress}`;
    await checkKYC(walletAddress);
  } else if (window.solflare) {
    const resp = await window.solflare.connect();
    walletAddress = resp.publicKey.toString();
    walletDisplay.innerText = `Wallet: ${walletAddress}`;
    await checkKYC(walletAddress);
  } else {
    alert("No supported wallet found (Phantom or Solflare).");
  }
}

connectBtn.addEventListener('click', connectWallet);

// ---- KYC ----
async function checkKYC(wallet) {
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
    tierDisplay.innerText = `Tier ${tierLevel} (${getTierName(tierLevel)})`;
    logTier(wallet, tierLevel);

    beforeInput.disabled = false;
  } catch (err) {
    console.error("Error checking KYC:", err);
  }
}

function getTierName(tier) {
  switch (tier) {
    case 1: return "Basic";
    case 2: return "Driver";
    case 3: return "Advanced";
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

// ---- Start Volunteering ----
beforeInput.addEventListener('change', async () => {
  const file = beforeInput.files[0];
  if (!file || !walletAddress) return;

  const ref = storage.ref(`volunteerPhotos/${walletAddress}/before_${Date.now()}.jpg`);
  const snap = await ref.put(file);
  startPhotoUrl = await snap.ref.getDownloadURL();

  sessionStart = new Date();
  beforeInput.disabled = true;
  afterInput.disabled = false;

  const position = await getGeolocation();
  alert(`Thank you for volunteering!\nStart: ${sessionStart.toLocaleString()}`);

  await db.collection("volunteerSessions").doc(`${walletAddress}_${Date.now()}`).set({
    wallet: walletAddress,
    startTime: firebase.firestore.Timestamp.fromDate(sessionStart),
    startPhoto: startPhotoUrl,
    startLocation: position,
    tier: tierLevel
  });
});

// ---- Stop Volunteering ----
afterInput.addEventListener('change', async () => {
  const file = afterInput.files[0];
  if (!file || !walletAddress || !sessionStart) return;

  const sessionEnd = new Date();
  const durationHours = (sessionEnd - sessionStart) / (1000 * 60 * 60);
  const multiplier = getTierMultiplier(tierLevel);
  const tokensThisSession = parseFloat((durationHours * multiplier).toFixed(2));

  const ref = storage.ref(`volunteerPhotos/${walletAddress}/after_${Date.now()}.jpg`);
  const snap = await ref.put(file);
  const afterPhotoUrl = await snap.ref.getDownloadURL();

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

  updateProgressBar(totalTokens);

  summaryBox.style.display = 'block';
  await loadAfterPhotos();
});

async function getGeolocation() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }),
      () => resolve({ lat: null, lng: null })
    );
  });
}

async function getTotalTokens(wallet) {
  const query = await db.collection("volunteerSessions").where("wallet", "==", wallet).get();
  let total = 0;
  query.forEach(doc => {
    const data = doc.data();
    total += data.tokensEarned || 0;
  });
  return parseFloat(total.toFixed(2));
}

async function fetchLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lovebutton&vs_currencies=usd");
    const data = await res.json();
    return data.lovebutton?.usd || 2.50;
  } catch (err) {
    console.warn("LVBTN price fetch failed, fallback to $2.50");
    return 2.50;
  }
}

// ---- Load Past After Photos ----
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

// ---- Progress Bar ----
function updateProgressBar(totalTokens) {
  let percent = 0;
  if (totalTokens >= 1000) {
    percent = 100;
  } else if (totalTokens >= 600) {
    percent = 80;
  } else if (totalTokens >= 300) {
    percent = 60;
  } else if (totalTokens >= 100) {
    percent = 40;
  } else if (totalTokens >= 25) {
    percent = 20;
  }

  progressBar.style.width = `${percent}%`;
  progressBar.innerText = `${percent}% Progress`;
}

