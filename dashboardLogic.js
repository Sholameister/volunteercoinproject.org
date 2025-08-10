// dashboardLogic.js — wallet connect + session history

import { connectWallet, getWalletAddress } from './connectWallet.js';
import {
  db, collection, getDocs, query, where, orderBy
} from './firebaseConfig.js';

if (location.pathname.includes('dashboard.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    const connectBtn = $('connectDashboardWalletBtn');
    const walletDisplay = $('walletDisplay');
    const totalTokensEl = $('totalTokens');
    const usdTotalEl = $('usdTotalValue');
    const listEl = $('sessionList');

    const FIXED_PRICE = 10; // $10 for now

    async function loadSessions(addr) {
      try {
        const q = query(
          collection(db, 'volunteerSessions'),
          where('walletAddress', '==', addr),
          orderBy('startTime', 'desc')
        );
        const snap = await getDocs(q);

        let totalTokens = 0;
        let cards = '';
        snap.forEach(docSnap => {
          const s = docSnap.data();
          totalTokens += Number(s.tokensEarned || 0);
          const start = new Date(s.startTime).toLocaleString();
          const end = new Date(s.endTime).toLocaleString();
          cards += `
            <div class="sessionCard">
              <div><strong>${start}</strong> → ${end}</div>
              <div>Tokens: ${s.tokensEarned} | Tier: ${s.tierLevel} | USD: $${(Number(s.tokensEarned||0)*FIXED_PRICE).toFixed(2)}</div>
              ${s.endPhotoUrl ? `<img src="${s.endPhotoUrl}" alt="After photo">` : ''}
            </div>
          `;
        });

        if (listEl) listEl.innerHTML = cards || 'No sessions yet. Log your first one on the Volunteer Logger.';
        if (totalTokensEl) totalTokensEl.textContent = `Total LVBTN Earned: ${totalTokens.toFixed(2)}`;
        if (usdTotalEl) usdTotalEl.textContent = `Total USD Value: $${(totalTokens*FIXED_PRICE).toFixed(2)}`;
      } catch (e) {
        console.error('loadSessions failed', e);
        if (listEl) listEl.textContent = 'Error loading sessions.';
      }
    }

    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        const addr = (await connectWallet()) || getWalletAddress();
        if (!addr) return;
        if (walletDisplay) walletDisplay.textContent = `Wallet: ${addr}`;
        await loadSessions(addr);
      });
    }
  });
}
