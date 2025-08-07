<script type="module">
  export async function connectWallet() {
    if ('solana' in window) {
      const provider = window.solana;
      if (provider.isPhantom) {
        try {
          const resp = await provider.connect();
          return resp.publicKey.toString();
        } catch (err) {
          console.error("Wallet connection failed:", err);
        }
      }
    } else {
      alert("Phantom Wallet not found. Please install it to proceed.");
    }
  }

  export async function getWalletAddress() {
    if (window.solana && window.solana.isConnected) {
      return window.solana.publicKey.toString();
    }
    return null;
  }

  export async function fetchLiveLVBTNPrice() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      const solPrice = data.solana.usd;
      const lvbtnPrice = solPrice * 2.5;
      return lvbtnPrice.toFixed(2);
    } catch (error) {
      console.error("Error fetching price:", error);
      return "10.00"; // fallback
    }
  }
</script>
