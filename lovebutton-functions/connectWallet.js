// ---- Firebase Modular Import Setup ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc,
  serverTimestamp, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
  authDomain: "lovebutton-heaven.firebaseapp.com",
  projectId: "lovebutton-heaven",
  storageBucket: "lvbtn-bucket.appspot.com",
  messagingSenderId: "1079456151721",
  appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
  measurementId: "G-0261HYV08P"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ---- Globals ----
let walletAddress = null;
let tierLevel = null;
let sessionStart = null;
let startPhotoUrl = null;

// ---- DOM Elements ----
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

// ---- Wallet Connection ----
async function connectWallet() {
  try {
    let provider = null;
    if (window.solana && window.solana.isPhantom) {
      provider = window.solana;
    } else if (window.solflare) {
      provider = window.solflare;
    }

    if (!provider) {
      alert("No supported wallet found (Phantom or Solflare).");
      return;
    }

    const res = await provider.connect();
    walletAddress = res.publicKey.toString();
    walletDisplay.innerText = `Wallet: ${walletAddress}`;
    console.log("Connected to wallet:", walletAddress);
    await checkKYC(walletAddress);
  } catch (err) {
    console.error("Wallet connection failed:", err);
    alert("Wallet connection failed.");
  }
}

// ---- KYC Check ----
async function checkKYC(wallet) {
  try {
    const docRef = doc(db, "verifiedKYC", wallet);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || !docSnap.data().verifiedKYC) {
      kycStatus.innerText = "❌ KYC not approved";
      tierDisplay.innerText = "Tier: N/A";
      return;
    }

    const userData = docSnap.data();
    tierLevel = userData.tier || 1;

    kycStatus.innerText = "✅ KYC Approved";
    tierDisplay.innerText = `Tier ${tierLevel} (${getTierName(tierLevel)})`;

    await setDoc(doc(db, "sessionLogs", wallet), {
      wallet,
      tier: tierLevel,
      timestamp: serverTimestamp()
    });

    beforeInput.disabled = false;

  } catch (err) {
    console.error("Error checking KYC:", err);
  }
}

// ---- Tier Tools ----
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

// ---- Start Volunteering ----
beforeInput?.addEventListener('change', async () => {
  const file = beforeInput.files[0];
  if (!file || !walletAddress) return;

  const storagePath = `volunteerPhotos/${walletAddress}/before_${Date.now()}.jpg`;
  const fileRef = storageRef(storage, storagePath);
  const snap = await uploadBytes(fileRef, file);
  startPhotoUrl = await getDownloadURL(snap.ref);

  sessionStart = new Date();
  beforeInput.disabled = true;
  afterInput.disabled = false;

  const position = await getGeolocation();
  alert(`Thank you for volunteering!\nStart: ${sessionStart.toLocaleString()}`);

  const sessionId = `${walletAddress}_${sessionStart.getTime()}`;
  await setDoc(doc(db, "volunteerSessions", sessionId), {
    wallet: walletAddress,
    startTime: sessionStart,
    startPhoto: startPhotoUrl,
    startLocation: position,
    tier: tierLevel
  });
});

// ---- Stop Volunteering ----
afterInput?.addEventListener('change', async () => {
  const file = afterInput.files[0];
  if (!file || !walletAddress || !sessionStart) return;

  const sessionEnd = new Date();
  const durationHours = (sessionEnd - sessionStart) / (1000 * 60 * 60);
  const multiplier = getTierMultiplier(tierLevel);
  const tokensThisSession = parseFloat((durationHours * multiplier).toFixed(2));

  const storagePath = `volunteerPhotos/${walletAddress}/after_${Date.now()}.jpg`;
  const fileRef = storageRef(storage, storagePath);
  const snap = await uploadBytes(fileRef, file);
  const afterPhotoUrl = await getDownloadURL(snap.ref);

  const sessionId = `${walletAddress}_${sessionStart.getTime()}`;
  await updateDoc(doc(db, "volunteerSessions", sessionId), {
    endTime: sessionEnd,
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

// ---- Helper Functions ----
async function getGeolocation() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null })
    );
  });
}

async function getTotalTokens(wallet) {
  const q = query(collection(db, "volunteerSessions"), where("wallet", "==", wallet));
  const snapshot = await getDocs(q);
  let total = 0;
  snapshot.forEach(doc => {
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
  const q = query(collection(db, "volunteerSessions"), where("wallet", "==", walletAddress));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  photoGallery.innerHTML = "";
  afterPhotosBox.style.display = 'block';

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.afterPhoto) {
      const img = document.createElement("img");
      img.src = data.afterPhoto;
      img.className = "after-photo";
      photoGallery.appendChild(img);
    }
  });
}

function updateProgressBar(totalTokens) {
  let percent = 0;
  if (totalTokens >= 1000) percent = 100;
  else if (totalTokens >= 600) percent = 80;
  else if (totalTokens >= 300) percent = 60;
  else if (totalTokens >= 100) percent = 40;
  else if (totalTokens >= 25) percent = 20;

  progressBar.style.width = `${percent}%`;
  progressBar.innerText = `${percent}% Progress`;
}

// ---- Event Binding ----
document.addEventListener('DOMContentLoaded', () => {
  if (connectBtn) {
    connectBtn.addEventListener('click', connectWallet);
  } else {
    console.warn("connectWalletBtn not found.");
  }
});