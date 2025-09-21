// connectWallet.js (ES module; no HTML here)

// ----- Helpers -----
function ensureHintBanner() {
  let hint = document.getElementById('phantomHint');
  if (hint) return hint;

  hint = document.createElement('div');
  hint.id = 'phantomHint';
  hint.style.cssText = 'display:none;padding:12px;margin:10px;border:1px solid #eee;border-radius:8px;background:#fff4f8;max-width:480px;margin-inline:auto';
  hint.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px;">Wallet optional</div>
    <div style="margin-bottom:10px;">
      You can browse without connecting. If you want wallet features, open this site in a wallet app.
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <button id="openInPhantom" style="padding:10px 14px;border-radius:6px;border:none;background:#e60073;color:#fff;cursor:pointer">Open in Phantom</button>
      <button id="getPhantom" style="padding:10px 14px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Get Phantom</button>
      <button id="continueNoWallet" style="padding:10px 14px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Continue without wallet</button>
    </div>
  `;
  (document.body || document.documentElement).insertBefore(hint, document.body.firstChild);
  return hint;
}

const ua = navigator.userAgent || '';
const isIOS = /iP(hone|od|ad)/.test(ua);
const isAndroid = /Android/.test(ua);
const isMobile = isIOS || isAndroid;

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

function maybeShowHint() {
  const hasPhantom = !!(window?.solana && window.solana.isPhantom);
  if (isMobile && !hasPhantom) {
    const hint = ensureHintBanner();
    hint.style.display = 'block';
    hint.querySelector('#openInPhantom')?.addEventListener('click', openPhantomDeepLink);
    hint.querySelector('#getPhantom')?.addEventListener('click', () => {
      if (isIOS) location.href = 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977';
      else if (isAndroid) location.href = 'https://play.google.com/store/apps/details?id=app.phantom';
      else location.href = 'https://phantom.app/download';
    });
    hint.querySelector('#continueNoWallet')?.addEventListener('click', () => {
      hint.style.display = 'none';
    });
  }
}

function paintWalletUi(pubkeyBase58) {
  const short = pubkeyBase58 ? pubkeyBase58.slice(0, 4) + '…' + pubkeyBase58.slice(-4) : '';
  const byId = (id) => document.getElementById(id);
  const walletAddress = byId('walletAddress');
  const walletStatus = byId('walletStatus');
  const signupDisp = byId('signupWalletDisplay');

  if (walletAddress) walletAddress.textContent = pubkeyBase58 ? `Wallet: ${short}` : 'Wallet: Not Connected';
  if (signupDisp)    signupDisp.textContent   = pubkeyBase58 ? `Connected: ${short}` : '';
  if (walletStatus)  walletStatus.textContent = pubkeyBase58 ? 'Wallet connected' : 'Wallet not connected';
}

// Get best available provider + label
function getWalletProvider() {
  // Phantom primary
  if (window?.solana?.isPhantom) return { type: 'Phantom', provider: window.solana };
  // Solflare injects window.solflare
  if (window?.solflare?.isSolflare) return { type: 'Solflare', provider: window.solflare };
  // Backpack (optional)
  if (window?.backpack?.solana)     return { type: 'Backpack', provider: window.backpack.solana };
  // Fallback to any window.solana
  if (window?.solana)               return { type: 'Solana', provider: window.solana };
  return { type: null, provider: null };
}

// ----- Main connect -----
async function handleConnect() {
  const { type, provider } = getWalletProvider();
  if (!provider) {
    maybeShowHint();
    return null;
  }
  try {
    // Phantom/Solflare compatible ‘connect’
    const resp = await provider.connect();
    const pubkey = (resp?.publicKey?.toString?.()) || (provider.publicKey?.toString?.());
    if (pubkey) {
      window.appWallet = { publicKey: pubkey, type };
      paintWalletUi(pubkey);
      // analytics (safe fields only)
      try {
        window.gtag?.('event', 'wallet_connected', { wallet_type: type, last4: pubkey.slice(-4) });
      } catch {}
      document.dispatchEvent(new CustomEvent('wallet:connected', { detail: { publicKey: pubkey, type } }));
    }
    return resp || provider;
  } catch (e) {
    console.error('Connect failed:', e);
    const walletStatus = document.getElementById('walletStatus');
    if (walletStatus) walletStatus.textContent = 'Wallet connection cancelled or failed.';
    return null;
  }
}

function setupConnectButton() {
  const btn = document.getElementById('connectWalletBtn');
  if (!btn) return;

  // loginLogic.js binds the click
  const { provider } = getWalletProvider();
  if (provider?.isConnected && provider.publicKey) {
    const pubkey = provider.publicKey.toString();
    window.appWallet = { publicKey: pubkey };
    paintWalletUi(pubkey);
  } else {
    paintWalletUi(null);
  }
}

function wireProviderEvents() {
  const { provider, type } = getWalletProvider();
  if (!provider) return;

  // Phantom/Solflare compatible events
  provider.on?.('accountChanged', (pk) => {
    const pubkey = pk ? pk.toString() : null;
    if (pubkey) {
      window.appWallet = { publicKey: pubkey, type };
      paintWalletUi(pubkey);
      document.dispatchEvent(new CustomEvent('wallet:connected', { detail: { publicKey: pubkey, type } }));
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

document.addEventListener('DOMContentLoaded', () => {
  setupConnectButton();
  wireProviderEvents();
  maybeShowHint();
});

export { handleConnect };
