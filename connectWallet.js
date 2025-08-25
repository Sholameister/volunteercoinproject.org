// connectWallet.js  (ES module; no HTML in here)

// Utility: create the Phantom hint banner lazily
function ensureHintBanner() {
  let hint = document.getElementById('phantomHint');
  if (hint) return hint;

  hint = document.createElement('div');
  hint.id = 'phantomHint';
  hint.style.cssText =
    'display:none;padding:12px;margin:10px;border:1px solid #eee;border-radius:8px;background:#fff4f8;max-width:480px;margin-inline:auto';

  hint.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px;">Wallet optional</div>
    <div style="margin-bottom:10px;">
      You can browse without connecting. If you want to use wallet features, open this site in the Phantom app.
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <button id="openInPhantom" style="padding:10px 14px;border-radius:6px;border:none;background:#e60073;color:#fff;cursor:pointer">Open in Phantom</button>
      <button id="getPhantom" style="padding:10px 14px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Get Phantom</button>
      <button id="continueNoWallet" style="padding:10px 14px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Continue without wallet</button>
    </div>
  `;
  // Put near top of page content
  const body = document.body || document.documentElement;
  body.insertBefore(hint, body.firstChild);
  return hint;
}

// Basic env detection
const ua = navigator.userAgent || '';
const isIOS = /iP(hone|od|ad)/.test(ua);
const isAndroid = /Android/.test(ua);
const isMobile = isIOS || isAndroid;

// Solana provider (from the IIFE bundle you load on the page)
const provider = window?.solana;

// Hook up the hint banner if mobile & Phantom not present
function maybeShowHint() {
  if (isMobile && !(provider && provider.isPhantom)) {
    const hint = ensureHintBanner();
    hint.style.display = 'block';

    // Wire buttons
    const btnOpen = hint.querySelector('#openInPhantom');
    const btnGet = hint.querySelector('#getPhantom');
    const btnContinue = hint.querySelector('#continueNoWallet');

    if (btnOpen) {
      btnOpen.onclick = () => {
        const target = 'https://phantom.app/ul/browse?url=' + encodeURIComponent(location.href);
        location.href = target;
      };
    }
    if (btnGet) {
      btnGet.onclick = () => {
        if (isIOS) location.href = 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977';
        else if (isAndroid) location.href = 'https://play.google.com/store/apps/details?id=app.phantom';
        else location.href = 'https://phantom.app/download';
      };
    }
    if (btnContinue) {
      btnContinue.onclick = () => { hint.style.display = 'none'; };
    }
  }
}

// Update any UI labels if present
function paintWalletUi(pubkeyBase58) {
  const short = pubkeyBase58 ? pubkeyBase58.slice(0, 4) + '…' + pubkeyBase58.slice(-4) : '';
  const byId = (id) => document.getElementById(id);

  const walletAddress = byId('walletAddress');
  const walletStatus  = byId('walletStatus');
  const signupDisp    = byId('signupWalletDisplay');

  if (walletAddress) walletAddress.textContent = pubkeyBase58
    ? `Wallet: ${short}`
    : 'Wallet: Not Connected';

  if (signupDisp) signupDisp.textContent = pubkeyBase58
    ? `Connected: ${short}`
    : '';

  if (walletStatus) walletStatus.textContent = pubkeyBase58
    ? 'Wallet connected'
    : 'Wallet not connected';
}

// Main connect handler (call on button click)
async function handleConnect() {
  if (!(provider && provider.isPhantom)) {
    maybeShowHint();
    return null;
  }
  try {
    const resp = await provider.connect(); // prompts user
    const pubkey = resp?.publicKey?.toString?.();
    if (pubkey) {
      window.appWallet = { publicKey: pubkey }; // make available to other modules
      paintWalletUi(pubkey);
      // Broadcast a custom event so loginLogic/signup can react
      document.dispatchEvent(new CustomEvent('wallet:connected', { detail: { publicKey: pubkey } }));
    }
    return resp;
  } catch (e) {
    console.error('Connect failed:', e);
    const walletStatus = document.getElementById('walletStatus');
    if (walletStatus) walletStatus.textContent = 'Wallet connection cancelled or failed.';
    return null;
  }
}

// Auto-bind any connect button present on the page
function setupConnectButton() {
  const btn = document.getElementById('connectWalletBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    handleConnect();
  });

  // If Phantom is already connected (returning visitor), reflect UI
  if (provider?.isConnected && provider.publicKey) {
    const pubkey = provider.publicKey.toString();
    window.appWallet = { publicKey: pubkey };
    paintWalletUi(pubkey);
  } else {
    paintWalletUi(null);
  }
}

// Listen for Phantom account changes & disconnects
function wireProviderEvents() {
  if (!provider) return;
  provider.on?.('accountChanged', (pk) => {
    const pubkey = pk ? pk.toString() : null;
    if (pubkey) {
      window.appWallet = { publicKey: pubkey };
      paintWalletUi(pubkey);
      document.dispatchEvent(new CustomEvent('wallet:connected', { detail: { publicKey: pubkey } }));
    } else {
      window.appWallet = null;
      paintWalletUi(null);
      document.dispatchEvent(new CustomEvent('wallet:disconnected'));
    }
  });
  provider.on?.('disconnect', () => {
    window.appWallet = null;
    paintWalletUi(null);
    document.dispatchEvent(new CustomEvent('wallet:disconnected'));
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupConnectButton();
  wireProviderEvents();
  // Show hint proactively on mobile with no Phantom
  maybeShowHint();
});

export { handleConnect };
