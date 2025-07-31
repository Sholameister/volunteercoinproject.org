// connectWallet.js

async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect();
      console.log("✅ Wallet connected:", resp.publicKey.toString());
      return resp.publicKey.toString();
    } catch (err) {
      console.error("❌ Wallet connection failed:", err);
      alert("Failed to connect Phantom Wallet.");
      return null;
    }
  } else {
    alert("Phantom Wallet not found. Install it from https://phantom.app");
    return null;
  }
}

async function getWalletAddress() {
  try {
    return window.solana?.publicKey?.toString() || null;
  } catch {
    return null;
  }
}

async function fetchLiveLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lvbtn&vs_currencies=usd");
    const data = await res.json();
    const price = data?.lvbtn?.usd;
    if (!price) throw new Error("Price not found");
    return price;
  } catch (err) {
    console.warn("⚠️ Falling back to $2.50 LVBTN fixed price.");
    return 2.5;
  }
}

// Bind to global scope for compatibility with inline <script> tags
window.connectWallet = connectWallet;
window.getWalletAddress = getWalletAddress;
window.fetchLiveLVBTNPrice = fetchLiveLVBTNPrice;
