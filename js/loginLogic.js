// Firebase
const db = firebase.firestore();
const storage = firebase.storage();

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
const founderWallets = [
  "HwTjV2Bv1ftQXZENfR3S72T4AbA1EHnWAm8R1ViksTkq",
  "5z4Q4mjxJ5W3wMGVxXQbPX79a89XJr5BVEfXA7djqFSF",
];
// ---- 1. Connect Wallet ----
connectBtn.addEventListener('click', async () => {
  if (!window.solana || !window.solana.isPhantom) {
    alert('Phantom Wallet not found!');
    return;
  }

  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    walletDisplay.innerText = `Wallet: ${walletAddress}`;
    await checkKYC(walletAddress);
  } catch (err) {
    console.error('Wallet connect error:', err);
  }
});

async function checkKYC(wallet) {
  if (founderWallets.includes(wallet)) {
    kycStatus.innerText = "✅ Founder Access Granted";
    tierLevel = 3;
    tierDisplay.innerText = `Tier ${tierLevel} (Founder Override) – ${getTierMultiplier(tierLevel)} LVBTN/hr`;
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

// ---- 3. Start Volunteering ----
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

// ---- 4. Stop Volunteering ----
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

  // Summary
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
  const hoursLink = document.createElement('a');
hoursLink.href = 'volunteer-hours.html';
hoursLink.innerText = '📋 View Full Volunteer History';
hoursLink.style.display = 'block';
hoursLink.style.marginTop = '10px';
hoursLink.style.textAlign = 'center';
summaryBox.appendChild(hoursLink);
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

// ---- 5. Load Past After Photos ----
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
