export async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect();
      return resp.publicKey.toString();
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("Failed to connect Phantom Wallet.");
      return null;
    }
  } else {
    alert("Phantom Wallet not found. Install from https://phantom.app.");
    return null;
  }
}

export async function getWalletAddress() {
  return window.solana?.publicKey?.toString() || null;
}

export async function fetchLiveLVBTNPrice() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=lvbtn&vs_currencies=usd");
    const data = await res.json();
    return data.lvbtn?.usd || 2.5;
  } catch {
    return 2.5;
  }
}
