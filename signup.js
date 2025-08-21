// signup.js — wallet connect + KYC/tier display

import { connectWallet } from './connectWallet.js';
import { db, doc, getDoc } from './firebaseConfig.js';

if (location.pathname.includes('./signup.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    const connectBtn = $('connectWalletBtn');
    const walletAddressSlot = $('walletAddress') || $('signupWalletDisplay');
    const walletStatus = $('walletStatus');
    const kycStatus = $('kycStatus');
    const tierInfo = $('tierInfo');

    function paintTier(tier) {
      const t = Number(tier) || 1;
      tierInfo.textContent = `Tier: ${t}`;
      tierInfo.classList.remove('tier-1','tier-2','tier-3');
      tierInfo.classList.add(t === 3 ? 'tier-3' : t === 2 ? 'tier-2' : 'tier-1');
    }

    async function loadProfile(addr) {
      try {
        const ref = doc(db, 'users', addr);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const tier = data.tier ?? 1;
          const approved = Boolean(data.kycApproved ?? (tier > 1));
          paintTier(tier);
          if (kycStatus) kycStatus.textContent = `KYC: ${approved ? '✅ Approved' : '⏳ Pending'}`;
        } else {
          paintTier(1);
          if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
        }
      } catch (e) {
        console.error('loadProfile failed', e);
        if (kycStatus) kycStatus.textContent = 'KYC: (error loading status)';
      }
    }

    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        try {
          const addr = await connectWallet();
          if (!addr) return;
          if (walletAddressSlot) walletAddressSlot.textContent = `Wallet: ${addr}`;
          if (walletStatus) walletStatus.textContent = '✅ Wallet Connected';
          await loadProfile(addr);
        } catch (e) {
          console.error('connect failed', e);
          alert('Could not connect wallet.');
        }
      });
    }
  });
}
