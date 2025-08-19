// setupKycDom.js
import { setKycDomElements } from './kycUtils.js';

document.addEventListener('DOMContentLoaded', () => {
  setKycDomElements({
    walletDisplay: document.getElementById('walletAddress'),
    kycStatus: document.getElementById('kycStatus'),
    tierStatus: document.getElementById('tierInfo'),
    // Add others if needed
  });
});