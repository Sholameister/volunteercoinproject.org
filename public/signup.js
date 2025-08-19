import { connectWallet } from './connectWallet.js';
import { fetchBlockedWallets } from './kycUtils.js';
document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWalletBtn');
  const walletDisplay = document.getElementById('signupWalletDisplay');

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        const walletAddress = await connectWallet();
        if (!walletAddress) return;

        const blockedWallets = await fetchBlockedWallets();
        if (blockedWallets.includes(walletAddress)) {
          alert("🚫 This wallet is blocked.");
          document.body.innerHTML = '<h2 style="color:red;text-align:center;">Access Denied. Blocked Wallet.</h2>';
          throw new Error("Blocked wallet attempted access.");
        }

        walletDisplay.textContent = `Wallet: ${walletAddress}`;
      } catch (err) {
        console.error("⚠️ Wallet connection or blocklist check failed:", err);
        alert("Something went wrong while connecting your wallet.");
      }
    });
  } else {
    console.warn("connectWalletBtn not found in DOM.");
  }
});