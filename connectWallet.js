// connectWallet.js (ES module; no HTML in here)

// Utility: create the wallet hint banner lazily
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
      You can browse without connecting. If you want to use wallet features, open this site in a wallet app.
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <button id="openInPhantom" style="padding:10px 14px;border-radius:6px;border:none;background:#e60073;color:#fff;cursor:pointer">Open in Phantom</button>
      <button id="getPhantom" style="padding:10px 14px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Get Phantom</button>
      <button id="continueNoWallet" style="padding:10px 14px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Continue without wallet</button>
    </div>
  `;
  const body = document.body || document.documentElement;
  body.insertBefore(hint, body.firstChild);
  return hint;
}

// Env detection
const ua = navigator.userAgent || '';
const isIOS = /iP(hone|od|ad)/.test(ua);
const isAndroid = /Android/.test(ua);
const isMobile = isIOS || isAndroid;

// Solana provider (if injected)
const provider = window?.solana;

// Deep-link helper for Phantom (scheme first, then universal link)
function openPhantomDeepLink() {
  const url = location.href;
  const scheme = 'phantom://browse/' + encodeURIComponent(url);
  const fallback = 'https://phantom.app/ul/browse/' + encodeURIComponent(url);

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = scheme;
  document.body.appendChild(iframe);

  setTimeout(() => { location.href = fallback; }, 800);
  setTimeout(() => { try { document.body.removeChild(iframe); } catch(_){} }, 3000);
}

// Show hint banner on mobile if Phantom not present
function maybeShowHint() {
  if (isMobile && !(provider && provider.isPhantom)) {
    const hint = ensureHintBanner();
    hint.style.display = 'block';

    const btnOpen = hint.querySelector('#openInPhantom');
    const btnGet = hint.querySelector('#getPhantom');
    const btnContinue = hint.querySelector('#continueNoWallet');

    if (btnOpen) btnOpen.onclick = openPhantomDeepLink;
    if (btnGet) {
      btnGet.onclick = () => {
        if (isIOS) location.href = 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977';
        else if (isAndroid) location.href = 'https://play.google.com/store/apps/details?id=app.phantom';
        else location.href = 'https://phantom.app/download';
      };
    }
    if (btnContinue) btnContinue.onclick = () => { hint.style.display = 'none'; };
  }
}

// Paint wallet UI if those elements exist
function paintWalletUi(pubkeyBase58) {
  const short = pubkeyBase58 ? pubkeyBase58.slice(0, 4) + '…' + pubkeyBase58.slice(-4) : '';
  const byId = (id) => document.getElementById(id);
  const walletAddress = byId('walletAddress');
  const walletStatus = byId('walletStatus');
  const signupDisp = byId('signupWalletDisplay');
  if (walletAddress) walletAddress.textContent = pubkeyBase58 ? `Wallet: ${short}` : 'Wallet: Not Connected';
  if (signupDisp) signupDisp.textContent = pubkeyBase58 ? `Connected: ${short}` : '';
  if (walletStatus) walletStatus.textContent = pubkeyBase58 ? 'Wallet connected' : 'Wallet not connected';
}

// Main connect handler (called by loginLogic.js)
async function handleConnect() {
  const provider = window?.solana;
  if (!(provider && provider.isPhantom)) {
    maybeShowHint();
    return null;
  }
  try {
    const resp = await provider.connect(); // prompts user once
    const pubkey = resp?.publicKey?.toString?.();
    if (pubkey) {
      window.appWallet = { publicKey: pubkey };
      paintWalletUi(pubkey);
      // Let other modules know (loginLogic.js listens for this)
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

// After Phantom / Solflare connection confirmed
gtag('event', 'wallet_connected', {
  wallet_address: walletAddress,
  wallet_type: walletType, // Phantom, Solflare, Backpack
  user_id: walletAddress
});


// Reflect state if already connected
function setupConnectButton() {
  const btn = document.getElementById('connectWalletBtn');
  if (!btn) return;

  // IMPORTANT: no click listener here — loginLogic.js is the single binder.
  const provider = window?.solana;
  if (provider?.isConnected && provider.publicKey) {
    const pubkey = provider.publicKey.toString();
    window.appWallet = { publicKey: pubkey };
    paintWalletUi(pubkey);
  } else {
    paintWalletUi(null);
  }
}

// Provider events
function wireProviderEvents() {
  const provider = window?.solana;
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

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupConnectButton();
  wireProviderEvents();
  maybeShowHint();
});

export { handleConnect };
