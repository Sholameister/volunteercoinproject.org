// connectWallet.js — unified wallet connect
export async function connectWallet() {
  const p = window.solana;
  if (!p || !p.isPhantom) {
    alert("Phantom Wallet not found. Install it to continue.");
    window.open("https://phantom.app/download", "_blank");
    return null;
  }
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    alert("Wallet requires HTTPS or localhost.");
    return null;
  }
  const resp = await p.connect({ onlyIfTrusted: false });
  const pk = resp?.publicKey?.toBase58?.();
  if (!pk) { alert("No public key returned."); return null; }
  (document.getElementById("walletAddress") || document.getElementById("walletDisplay"))?.replaceChildren(
    document.createTextNode(`Wallet: ${pk}`)
  );
  return pk;
}

export function getWalletAddress() {
  return window.solana?.publicKey?.toBase58?.() || null;
}
