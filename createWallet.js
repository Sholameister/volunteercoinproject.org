// Multi-wallet connection: Solana (Phantom/Backpack/Solflare) + Ethereum (MetaMask)

const ethereumConnect = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = accounts[0];
      return { type: "Ethereum", address: wallet };
    } catch (err) {
      console.error("MetaMask connection error:", err);
    }
  }
  return null;
};

const solanaConnect = async () => {
  const solana = window.solana;
  if (solana && (solana.isPhantom || solana.isBackpack)) {
    try {
      const resp = await solana.connect();
      return { type: "Solana", address: resp.publicKey.toString() };
    } catch (err) {
      console.error("Solana connection error:", err);
    }
  }
  return null;
};

document.getElementById("connectWallet").addEventListener("click", async () => {
  let result = await solanaConnect();

  if (!result) {
    result = await ethereumConnect();
  }

  const display = document.getElementById("walletAddress");
  if (result) {
    display.innerText = `✅ Connected: ${result.address} (${result.type})`;
  } else {
    display.innerText = "❌ No wallet detected. Please install MetaMask or Phantom.";
  }
});
