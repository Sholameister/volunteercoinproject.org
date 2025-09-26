// dashboardLogic.js — wallet connect + session history (Firebase v9 COMPAT)
import { db } from './firebaseConfig.js';
import { handleConnect } from './connectWallet.js';

if (location.pathname.includes('dashboard.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    const connectBtn   = $('connectDashboardWalletBtn');
    const walletDisplay= $('walletDisplay');
    const totalTokensEl= $('totalTokens');
    const usdTotalEl   = $('usdTotalValue');
    const listEl       = $('sessionList');

    // Keep your current $10 placeholder unless you tell me to sync to $2.50
    const FIXED_PRICE = 10;

    function shortAddr(addr){
      return addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : '';
    }

    async function loadSessions(addr) {
      try {
        if (!addr) throw new Error('No wallet address');

        // COMPAT API: db.collection(...).where(...).orderBy(...).get()
        const snap = await db
          .collection('volunteerSessions')
          .where('walletAddress', '==', addr)
          .orderBy('startTime', 'desc')
          .get();

        let totalTokens = 0;
        let cards = '';

        snap.forEach(docSnap => {
          const s = docSnap.data() || {};
          totalTokens += Number(s.tokensEarned || 0);
          const start = s.startTime ? new Date(s.startTime).toLocaleString() : '(no start)';
          const end   = s.endTime   ? new Date(s.endTime).toLocaleString()   : '(no end)';
          const usd   = (Number(s.tokensEarned || 0) * FIXED_PRICE).toFixed(2);

          cards += `
            <div class="sessionCard">
              <div><strong>${start}</strong> → ${end}</div>
              <div>Tokens: ${s.tokensEarned ?? 0} | Tier: ${s.tierLevel ?? '-' } | USD: $${usd}</div>
              ${s.endPhotoUrl ? `<img src="${s.endPhotoUrl}" alt="After photo">` : ''}
            </div>
          `;
        });

        if (listEl) listEl.innerHTML = cards || 'No sessions yet. Log your first one on the Volunteer Logger.';
        if (totalTokensEl) totalTokensEl.textContent = `Total LVBTN Earned: ${totalTokens.toFixed(2)}`;
        if (usdTotalEl) usdTotalEl.textContent = `Total USD Value: $${(totalTokens * FIXED_PRICE).toFixed(2)}`;
      } catch (e) {
        console.error('loadSessions failed', e);
        if (listEl) listEl.textContent = 'Error loading sessions.';
      }
    }

    async function getCurrentWalletAddr(resp){
      // Try response → window.appWallet → injected provider
      return (
        resp?.publicKey?.toString?.() ||
        window.appWallet?.publicKey ||
        window.solana?.publicKey?.toString?.() ||
        null
      );
    }

    // Connect button
    if (connectBtn) {
      // Avoid double binding if reloaded in SPA-ish contexts
      connectBtn.replaceWith(connectBtn.cloneNode(true));
      const freshBtn = $('connectDashboardWalletBtn');

      freshBtn.addEventListener('click', async () => {
        const resp = await handleConnect();
        const addr = await getCurrentWalletAddr(resp);
        if (!addr) return;
        if (walletDisplay) walletDisplay.textContent = `Wallet: ${addr} (${shortAddr(addr)})`;
        await loadSessions(addr);
      }, { passive: true });
    }

    // If already connected when page loads, auto-fill
    const preAddr = window.appWallet?.publicKey || window.solana?.publicKey?.toString?.();
    if (preAddr) {
      if (walletDisplay) walletDisplay.textContent = `Wallet: ${preAddr} (${shortAddr(preAddr)})`;
      loadSessions(preAddr);
    }
  });
}
