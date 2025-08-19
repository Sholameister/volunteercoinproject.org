
  export async function checkKYCStatus(wallet) {
    const docRef = db.collection("kyc").doc(wallet);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return data.tier || 1;
    } else {
      return 1;
    }
  }

  export function updateKycDom(tierLevel) {
    const tierDisplay = document.getElementById('tierInfo');
    const kycStatus = document.getElementById('kycStatus');

    if (tierLevel === 1) {
      tierDisplay.textContent = "Tier: 1 (Basic)";
      tierDisplay.className = "tier-badge tier-1";
      kycStatus.textContent = "Basic Signup Complete";
    } else if (tierLevel === 2) {
      tierDisplay.textContent = "Tier: 2 (KYC + Driver)";
      tierDisplay.className = "tier-badge tier-2";
      kycStatus.textContent = "KYC Verified!";
    } else if (tierLevel === 3) {
      tierDisplay.textContent = "Tier: 3 (Full Verified)";
      tierDisplay.className = "tier-badge tier-3";
      kycStatus.textContent = "KYC & Hours Verified!";
    }
  }