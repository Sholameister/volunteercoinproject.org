<script type="module">
  import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    BackpackWalletAdapter
  } from "https://cdn.skypack.dev/@solana/wallet-adapter-wallets";
  import { Connection, clusterApiUrl, PublicKey } from "https://cdn.skypack.dev/@solana/web3.js";

  const connectButton = document.getElementById("connectWallet");
  const walletDisplay = document.getElementById("walletAddress");

  // Phantom, Solflare, Backpack
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter()
  ];

  let selectedWallet = null;

  connectButton.addEventListener("click", async () => {
    for (let wallet of wallets) {
      if (wallet.readyState === "Installed") {
        selectedWallet = wallet;
        try {
          await wallet.connect();
          const publicKey = wallet.publicKey?.toBase58();
          walletDisplay.innerText = `🔑 Connected: ${publicKey}`;
          return;
        } catch (e) {
          console.error("Connection failed:", e);
        }
      }
    }
    walletDisplay.innerText = "❌ No supported wallet found.";
  });
</script>
