// DashboardLogic.js — no import statements, use window.db

let walletAddress = null;

async function connectWalletAndLoadSessions() {
  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    document.getElementById("walletDisplay").innerText = `Wallet: ${walletAddress}`;
    await loadSessionHistory(walletAddress);
  } catch (err) {
    alert("Wallet connection failed.");
    console.error("Wallet error:", err);
  }
}

async function loadSessionHistory(wallet) {
  const sessionList = document.getElementById("sessionList");
  sessionList.innerHTML = "";

  try {
    const db = window.db;
    const snapshot = await db
      .collection("volunteerSessions")
      .where("walletAddress", "==", wallet)
      .orderBy("timestamp", "desc")
      .get();

    let totalTokens = 0;
    let totalUSD = 0;
    let totalHours = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const start = new Date(data.startTime?.seconds * 1000 || data.startTime);
      const end = new Date(data.endTime?.seconds * 1000 || data.endTime);
      const durationHours = (end - start) / (1000 * 60 * 60);

      const tokens = parseFloat(data.tokensEarned || 0);
      const usd = parseFloat(data.usdValue || 0);
      const tier = data.tierLevel || "N/A";
      const startPhoto = data.startPhotoUrl || "https://via.placeholder.com/120?text=No+Photo";
      const endPhoto = data.endPhotoUrl || "https://via.placeholder.com/120?text=No+Photo";

      totalTokens += tokens;
      totalUSD += usd;
      totalHours += durationHours;

      const card = document.createElement("div");
      card.className = "sessionCard";
      card.innerHTML = `
        <p><strong>Date:</strong> ${start.toLocaleString()}</p>
        <p><strong>Tier:</strong> ${tier}</p>
        <p><strong>Duration:</strong> ${durationHours.toFixed(2)} hours</p>
        <p><strong>LVBTN Earned:</strong> ${tokens.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        <p><strong>USD Value:</strong> $${usd.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        <p><strong>Start Photo:</strong><br><img src="${startPhoto}" width="120"/></p>
        <p><strong>After Photo:</strong><br><img src="${endPhoto}" width="120"/></p>
      `;
      sessionList.appendChild(card);
    });

    document.getElementById("totalTokens").innerText = `Total LVBTN Earned: ${totalTokens.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("usdTotalValue").innerText = `Total USD Value: $${totalUSD.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const totalHoursDiv = document.createElement("div");
    totalHoursDiv.innerText = `Total Hours Volunteered: ${totalHours.toFixed(2)}`;
    totalHoursDiv.style.fontWeight = "bold";
    totalHoursDiv.style.marginTop = "10px";
    sessionList.prepend(totalHoursDiv);

  } catch (e) {
    console.error("Failed to load sessions:", e);
    sessionList.innerHTML = `<p style="color:red;">Failed to load volunteer history.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectDashboardWalletBtn');

  if (!window.solana?.isPhantom) {
    alert("Please install Phantom Wallet to use the dashboard.");
    return;
  }

  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      connectWalletAndLoadSessions();
    });
  }
});