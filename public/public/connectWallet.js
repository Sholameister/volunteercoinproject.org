// connectWallet.js — Phantom connect (ESM)
export async function connectWallet() {
  const provider = window?.phantom?.solana || window?.solana || null;
  if (!provider || !provider.isPhantom) {
    alert("Phantom Wallet not found. Install it to continue.");
    window.open("https://phantom.app/download", "_blank");
    return null;
  }
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    alert("Wallet requires HTTPS or localhost.");
    return null;
  }
  const resp = await provider.connect({ onlyIfTrusted: false });
  const pk = resp?.publicKey?.toBase58?.();
  if (!pk) { alert("No public key returned."); return null; }
  const slot = document.getElementById("walletAddress") || document.getElementById("walletDisplay");
  if (slot) slot.textContent = `Wallet: ${pk}`;
  return pk;
}

export function getWalletAddress() {
  const p = window?.phantom?.solana || window?.solana || null;
  return p?.publicKey?.toBase58?.() || null;
}