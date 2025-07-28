import { checkKYC, logVolunteerSession, setKycDomElements, resumeVolunteerSession, serverTimestamp } from './kycUtils.js';

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4JWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

let walletAddress = null;
let tierLevel = "Tier 1";
let tierMultiplier = 1;
let sessionStart = null;
let startPhotoUrl = null;
let position = { latitude: null, longitude: null };

// DOM Elements
const connectBtn = document.getElementById('connectWalletBtn');
const walletDisplay = document.getElementById('walletAddress');
const kycStatus = document.getElementById('verifiedKYC');
const tierDisplay = document.getElementById('tierInfo');
const beforeInput = document.getElementById('beforePhoto');
const afterInput = document.getElementById('afterPhoto');
const summaryBox = document.getElementById('summaryBox');
const sessionTimes = document.getElementById('sessionLogs');
const tokensEarned = document.getElementById('tokensEarned');
const totalLVBTN = document.getElementById('totalLVBTN');
const usdValue = document.getElementById('usdValue');
const priceDisplay = document.getElementById('lvbtnPrice');
const photoGallery = document.getElementById('photoGallery');

// Connect Wallet
connectBtn.addEventListener('click', async () => {
  if (window.solana && window.solana.isPhantom) {
    try {
      const res = await window.solana.connect();
      walletAddress = res.publicKey.toString();
      setKycDomElements({
      walletDisplay: document.getElementById('walletAddress'),
        kycStatus: document.getElementById('verifiedKYC'),
        tierStatus: document.getElementById(tierInfo'),
        tokenCalc: documentById(tokenEarned'),
        badge: documentById('badgeEl')
      });
      await checkKYC(walletAddress);
    });
    } catch (err) {
      alert('Wallet connection failed.');
      console.error(err);
    }
  } else {
    alert('Phantom wallet not found. Please install it.');
  }
});

// Start Volunteering
beforeInput.addEventListener('change', async () => {
  if (!walletAddress) return;

  const file = beforeInput.files[0];
  const ref = storage.ref(`beforePhotos/${walletAddress}_${Date.now()}`);
  await ref.put(file);
  startPhotoUrl = await ref.getDownloadURL();

  sessionStart = Date.now();
  position = await getGeolocation();

  localStorage.setItem("sessionStart", sessionStart);
  localStorage.setItem("startPhotoUrl", startPhotoUrl);
  localStorage.setItem("position", JSON.stringify(position));

  alert(`You have begun volunteering!\nTime: ${new Date(sessionStart).toLocaleString()}\nLocation: ${position.latitude}, ${position.longitude}`);

  afterInput.disabled = false;
  beforeInput.disabled = true;
});

// Stop Volunteering
afterInput.addEventListener('change', async () => {
  if (!walletAddress || !sessionStart) return;

  const sessionEnd = Date.now();
  const durationHours = Math.max((sessionEnd - sessionStart) / 3600000, 0.01);
  const earned = parseFloat((durationHours * tierMultiplier).toFixed(2));

  const file = afterInput.files[0];
  const ref = storage.ref(`afterPhotos/${walletAddress}_${Date.now()}`);
  await ref.put(file);
  const afterPhotoUrl = await ref.getDownloadURL();

  await firebase.firestore().collection("volunteerSessions").add({
    wallet: walletAddress,
    sessionStart: new Date(sessionStart),
    sessionEnd: new Date(sessionEnd),
    tokensEarned: earned,
    beforePhoto: startPhotoUrl,
    afterPhoto: afterPhotoUrl,
    geolocation: position,
    timestamp: serverTimestamp,
  });

  const total = await getTotalTokens(walletAddress);
  const price = await fetchLVBTNPrice();

  summaryBox.style.display = "block";
  sessionTimes.textContent = `Start: ${new Date(sessionStart).toLocaleString()} | End: ${new Date(sessionEnd).toLocaleString()}`;
  tokensEarned.textContent = `Tokens Earned: ${earned}`;
  totalLVBTN.textContent = `Total LVBTN: ${total}`;
  usdValue.textContent = `USD Value: $${(total * price).toFixed(2)}`;
  priceDisplay.textContent = `LVBTN Price: $${price}`;

  await showPhotoGallery(walletAddress);
  afterInput.disabled = true;

  // Clear session from localStorage
  localStorage.removeItem("sessionStart");
  localStorage.removeItem("startPhotoUrl");
  localStorage.removeItem("position");
});

// Show Gallery (Thumbnails)
async function showPhotoGallery(wallet) {
  const snapshot = await firebase.firestore().collection("volunteerSessions").where("wallet", "==", wallet).get();
  photoGallery.innerHTML = "";

  snapshot.forEach(doc => {
    const url = doc.data().afterPhotoUrl;
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.className = "after-Photo";
      photoGallery.appendChild(img);
    }
  });

  document.getElementById("afterPhotosBox").style.display = "block";
}

// Token Totals
async function getTotalTokens(wallet) {
  const snapshot = await firebase.firestore().collection("volunteerSessions").where("wallet", "==", wallet).get();
  let total = 0;
  snapshot.forEach(doc => {
    total += doc.data().tokensEarned || 0;
  });
  return parseFloat(total.toFixed(2));
}

// Live Price
async function fetchLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lvbtn&vs_currencies=usd");
    const data = await res.json();
    return data.lvbtn?.usd || 2.5;
  } catch {
    return 2.5;
  }
}

// Geolocation
function getGeolocation() {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true }
    );
  });
}
