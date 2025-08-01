import { connectWallet } from './connectWallet.js';
import { fetchBlockedWallets } from './kycUtils.js'; // If you're blocking wallets

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectWalletBtn');
  const walletDisplay = document.getElementById('signupWalletDisplay');

    connectBtn.addEventListener('click', async () => {
      const wallet = await connectWallet();
      if (!wallet) return;

      // Check against blocklist (if you're doing this)
      const blockedWallets = await fetchBlockedWallets();
      if (blockedWallets.includes(walletAddress)) {
        alert("🚫 This wallet is blocked.");
        document.body.innerHTML = '<h2 style="color:red;text-align:center;">Access Denied. Blocked Wallet.</h2>';
        throe new Error("Blockedwallet attempted access.");
      }

     document.getElementById('walletDisplay').textContent = `Wallet: ${walletAddress}`;
    });
  } else {
    console.warn("connectWalletBtn  not found in DOM.");
  }
});

<button id="connectSignupWalletBtn">Connect Wallet</button>
<p id="signupWalletDisplay">Wallet: Not Connected</p>
<script type="module" src="./signup.js></script>
