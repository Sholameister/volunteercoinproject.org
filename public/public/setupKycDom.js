//setupKycDom.js
import { setKycDomElements } from './kycUtils.js';

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => {
  const path = window.location.pathname.toLowerCase();
  const isKycPage = path.includes('login.html') || path.includes('signup.html');

  if (!isKycPage) {
    console.log('[setupKycDom] Skipped (not a KYC page)');
    return;
  }

  const walletDisplay = document.getElementById('walletAddress');
  const kycStatus     = document.getElementById('kycStatus');
  const tierStatus    = document.getElementById('tierInfo');

  if (!walletDisplay || !kycStatus || !tierStatus) {
    console.warn('[setupKycDom] Missing DOM elements:',
      { walletDisplay: !!walletDisplay, kycStatus: !!kycStatus, tierStatus: !!tierStatus }
    );
    return;
  }

  try {
    setKycDomElements({ walletDisplay, kycStatus, tierStatus });
    console.log('[setupKycDom] KYC DOM elements wired');
  } catch (e) {
    console.error('[setupKycDom] Failed to set KYC DOM elements', e);
  }
});