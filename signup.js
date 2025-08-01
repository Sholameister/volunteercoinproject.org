import { connectWallet } from './connectWallet.js';
import { fetchBlockedWallets } from './kycUtils.js'; // If you're blocking wallets

let walletAddress = null;

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectSignupWalletBtn');
  const walletDisplay = document.getElementById('signupWalletDisplay');

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      walletAddress = await connectWallet();
      if (!walletAddress) return;

      // Check against blocklist (if you're doing this)
      const blockedWallets = await fetchBlockedWallets();
      if (blockedWallets.includes(walletAddress)) {
        alert("🚫 This wallet is blocked.");
        document.body.innerHTML = '<h2 style="color:red;text-align:center;">Access Denied. Blocked Wallet.</h2>';
        return;
      }

      walletDisplay.textContent = `Wallet: ${walletAddress}`;
    });
  } else {
    console.warn("Connect button not found in DOM.");
  }
});
<button id="connectSignupWalletBtn">Connect Wallet</button>
<p id="signupWalletDisplay">Wallet: Not Connected</p>
<script type="module" src="./signup.js></script>
