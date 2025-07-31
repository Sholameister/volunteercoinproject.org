// connectWallet.js
export async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect();
      console.log("🟢 Wallet connected:", resp.publicKey.toString());
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

export async function getWalletAddress() {
  try {
    return window.solana?.publicKey?.toString() || null;
  } catch {
    return null;
  }
}

export async function fetchLiveLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lvbtn&vs_currencies=usd");
    const data = await res.json();
    const price = data?.lvbtn?.usd;
    if (!price) throw new Error("Price not found");
    return price;
  } catch (err) {
    console.error("Failed to fetch LVBTN price:", err);
    return null;
  }
}
