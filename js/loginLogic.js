// loginLogic.js
import { db, storage } from './firebaseConfig.js';

import {
  setKycDomElements,
  connectAndCheckKYC,
  walletAddress,
  tierLevel,
  tierMultiplier
} from './kycUtils.js';

import {
  getDoc,
  doc,
  collection,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';


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

// Session Variables
let walletAddress = null;
let tierLevel = null;
let sessionStart = null;
let startPhotoUrl = null;
let position = { latitude: null, longitude: null };
let tierMultiplier = 1;
// Connect Wallet Logic (Phantom)
connectBtn.addEventListener('click', async () => {
  if (window.solana && window.solana.isPhantom) {
    try {
      const response = await window.solana.connect();
      walletAddress = response.publicKey.toString();
      walletDisplay.innerText = `Wallet: ${walletAddress}`;
      await checkKYC(walletAddress);
    } catch (error) {
      console.error('Phantom wallet connection error:', error);
    }
  } else {
    alert('Phantom wallet not found. Please install it.');
  }
});

// KYC check
async function checkKYC(wallet) {
 const docRef = doc(db, "verifiedKYC", wallet);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tier = data.tier || "Tier 1";
    tierDisplay.innerText = `Tier: ${tier}`;
    kycStatus.innerText = `KYC: Verified`;
    switch (tier) {
      case "Tier 2":
        tierMultiplier = 1.25;
        break;
      case "Tier 3":
        tierMultiplier = 1.5;
        break;
      default:
        tierMultiplier = 1;
    }
  } else {
    tierDisplay.innerText = "Tier: Unverified";
    kycStatus.innerText = "KYC: Not Verified";
    tierMultiplier = 0;
    alert("KYC not found. Please complete verification first.");
  }
}

  // ⚠️ Put the rest of your logic (start/stop volunteering, uploads, etc.) inside this block as well

// Handle Before Photo (start session)
beforeInput.addEventListener('change', async () => {
  if (!walletAddress) return;

  const file = beforeInput.files[0];
  const storageRef = storage.ref(`beforePhotos/${walletAddress}_${Date.now()}`);
  await storageRef.put(file);
  startPhotoUrl = await storageRef.getDownloadURL();

  sessionStart = Date.now();
  const geo = await getGeolocation();

  alert(`You have begun volunteering!\nTime: ${new Date(sessionStart).toLocaleString()}\nLocation: ${geo.latitude}, ${geo.longitude}`);

  afterInput.disabled = false;
  beforeInput.disabled = true;
});

// Handle After Photo (stop session)
afterInput.addEventListener('change', async () => {
  if (!walletAddress || !sessionStart) return;

  const sessionEnd = Date.now();
  const durationHours = Math.max((sessionEnd - sessionStart) / 3600000, 0.01);
  const tokensThisSession = parseFloat((durationHours * tierMultiplier).toFixed(2));

  const afterFile = afterInput.files[0];
  const afterRef = storage.ref(`afterPhotos/${walletAddress}_${Date.now()}`);
  await afterRef.put(afterFile);
  const afterPhotoUrl = await afterRef.getDownloadURL();

  await db.collection("volunteerSessions").add({
    wallet: walletAddress,
    sessionStart: new Date(sessionStart),
    sessionEnd: new Date(sessionEnd),
    tokensEarned: tokensThisSession,
    beforePhoto: startPhotoUrl,
    afterPhoto: afterPhotoUrl,
    geolocation: await getGeolocation(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  // Fetch total tokens and price
  const total = await getTotalTokens(walletAddress);
  const price = await fetchLVBTNPrice();

  // Show summary
  summaryBox.style.display = "block";
  sessionTimes.textContent = `Start: ${new Date(sessionStart).toLocaleString()} | End: ${new Date(sessionEnd).toLocaleString()}`;
  tokensEarned.textContent = `Tokens Earned: ${tokensThisSession}`;
  totalLVBTN.textContent = `Total LVBTN: ${total}`;
  usdValue.textContent = `USD Value: $${(total * price).toFixed(2)}`;
  priceEl.textContent = `LVBTN Price: $${price}`;

  await showPhotoGallery(walletAddress);
  afterInput.disabled = true;
});

// Get total tokens from Firestore
async function getTotalTokens(wallet) {
  const query = await db.collection("volunteerSessions").where("wallet", "==", wallet).get();
  let total = 0;
  query.forEach(doc => {
    total += doc.data().tokensEarned || 0;
  });
  return parseFloat(total.toFixed(2));
}

// Fetch live LVBTN price
async function fetchLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lvbtn&vs_currencies=usd");
    const data = await res.json();
    return data.lvbtn?.usd || 2.5;
  } catch (e) {
    return 2.5;
  }
}

// Fetch photos from Firestore
async function showPhotoGallery(wallet) {
  const query = await db.collection("volunteerSessions").where("wallet", "==", wallet).get();
  photoGallery.innerHTML = "";
  query.forEach(doc => {
    const url = doc.data().afterPhoto;
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.className = "after-photo";
      photoGallery.appendChild(img);
    }
  });
  document.getElementById("afterPhotosBox").style.display = "block";
}

// Get geolocation
function getGeolocation() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true }
    );
  });
}
