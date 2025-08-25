// signup.js — wallet connect + KYC/tier display

import { handleConnect } from './connectWallet.js';
import { db, doc, getDoc } from './firebaseConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  // Only run on pages that actually look like signup
  const looksLikeSignup = !!document.getElementById('connectWalletBtn') &&
                          !!document.getElementById('kycStatus') &&
                          !!document.getElementById('tierInfo');
  if (!looksLikeSignup) return;

  const $ = (id) => document.getElementById(id);

  const connectBtn        = $('connectWalletBtn');
  const walletAddressSlot = $('walletAddress') || $('signupWalletDisplay');
  const walletStatus      = $('walletStatus');
  const kycStatus         = $('kycStatus');
  const tierInfo          = $('tierInfo');

  function paintTier(tier) {
    const t = Number(tier) || 1;
    tierInfo.textContent = `Tier: ${t}`;
    tierInfo.classList.remove('tier-1', 'tier-2', 'tier-3');
    tierInfo.classList.add(t === 3 ? 'tier-3' : t === 2 ? 'tier-2' : 'tier-1');
  }

  async function loadProfile(addr) {
    try {
      const ref  = doc(db, 'users', addr);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data     = snap.data();
        const tier     = data.tier ?? 1;
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

  function paintWallet(addr) {
    const short = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : '';
    if (walletAddressSlot) walletAddressSlot.textContent = addr ? `Wallet: ${short}` : 'Wallet: Not Connected';
    if (walletStatus)      walletStatus.textContent      = addr ? '✅ Wallet Connected' : 'Wallet not connected';
  }

  // Bind connect button
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const resp = await handleConnect(); // opens Phantom; sets window.appWallet + fires events
      const addr = resp?.publicKey?.toString?.() || window.appWallet?.publicKey || null;
      if (!addr) return;
      paintWallet(addr);
      await loadProfile(addr);
    });
  }

  // Also react to programmatic/returning connections
  document.addEventListener('wallet:connected', async (e) => {
    const addr = e.detail?.publicKey;
    if (!addr) return;
    paintWallet(addr);
    await loadProfile(addr);
  });

  document.addEventListener('wallet:disconnected', () => {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
  });

  // If already connected on load, reflect it
  const preAddr = window.appWallet?.publicKey || (window.solana?.publicKey?.toString?.());
  if (preAddr) {
    paintWallet(preAddr);
    loadProfile(preAddr);
  } else {
    paintWallet(null);
    paintTier(1);
    if (kycStatus) kycStatus.textContent = 'KYC: ⏳ Pending';
  }
});
