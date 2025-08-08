// /js/signup.js
import { connectWallet } from '/js/connectWallet.js';
import { fetchBlockedWallets } from '/js/kycUtils.js';

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWalletBtn');
  const walletDisplay = document.getElementById('signupWalletDisplay');

  if (!connectBtn) {
    console.warn("connectWalletBtn not found in DOM.");
    return;
  }

  connectBtn.addEventListener('click', async () => {
    // Phantom guard
    if (!window.solana?.isPhantom) {
      alert("Phantom Wallet not found. Please install Phantom to continue.");
      return;
    }

    // UI: disable while working
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting…';

    try {
      const walletAddress = await connectWallet();
      if (!walletAddress) return;

      // Blocklist check (defensive in case JSON is { blockedWallets: [...] } or just [...] )
      let blocked = [];
      try {
        const res = await fetchBlockedWallets();
        if (Array.isArray(res)) blocked = res;
        else if (Array.isArray(res?.blockedWallets)) blocked = res.blockedWallets;
        else if (Array.isArray(res?.wallets)) blocked = res.wallets;
      } catch (e) {
        console.warn('Blocklist fetch failed; proceeding open.', e);
      }

      if (blocked.map(s => s?.toLowerCase?.()).includes(walletAddress.toLowerCase())) {
        alert("🚫 This wallet is blocked.");
        document.body.innerHTML = '<h2 style="color:red;text-align:center;">Access Denied. Blocked Wallet.</h2>';
        throw new Error("Blocked wallet attempted access.");
      }

      if (walletDisplay) {
        walletDisplay.textContent = `Wallet: ${walletAddress}`;
      }
      connectBtn.textContent = 'Connected ✅';
    } catch (err) {
      console.error("⚠️ Wallet connection or blocklist check failed:", err);
      alert("Something went wrong while connecting your wallet.");
      connectBtn.textContent = 'Connect Wallet';
    } finally {
      connectBtn.disabled = false;
    }
  });
});
