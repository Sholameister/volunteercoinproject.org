<div id="phantomHint" style="display:none;padding:12px;margin:10px;border:1px solid #eee;border-radius:8px;background:#fff4f8;"><div style="font-weight:600;margin-bottom:8px;">Wallet optional</div>
  <div style="margin-bottom:10px;">You can browse without connecting. If you want to use wallet features, open the site in Phantom.</div>
  <button id="openInPhantom" style="margin-right:8px;">Open in Phantom</button>
  <button id="getPhantom" style="margin-right:8px;">Get Phantom</button>
  <button id="continueNoWallet">Continue without wallet</button>
</div>

<script type="module">
  const hint = document.getElementById('phantomHint');
  const btnOpen = document.getElementById('openInPhantom');
  const btnGet = document.getElementById('getPhantom');
  const btnContinue = document.getElementById('continueNoWallet');

  const ua = navigator.userAgent || '';
  const isIOS = /iP(hone|od|ad)/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const hasPhantom = !!(window?.solana?.isPhantom);

  // Show banner only on mobile when Phantom provider isn't present
  if (isMobile && !hasPhantom) {
    hint.style.display = 'block';
  }

  // Deep-link: open current page inside Phantom mobile app (works on iOS/Android)
  btnOpen.addEventListener('click', () => {
    const target = 'https://phantom.app/ul/browse?url=' + encodeURIComponent(location.href);
    location.href = target;
  });

  // Store/extension link: send users to install Phantom
  btnGet.addEventListener('click', () => {
    if (isIOS) {
      location.href = 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977';
    } else if (isAndroid) {
      location.href = 'https://play.google.com/store/apps/details?id=app.phantom';
    } else {
      location.href = 'https://phantom.app/download';
    }
  });

  // Let users continue normally (just hides the banner)
  btnContinue.addEventListener('click', () => {
    hint.style.display = 'none';
  });

  // IMPORTANT: Gate connection attempts instead of auto-redirecting
  // Example connect button:
  const connectBtn = document.getElementById('connectWalletBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      if (!window?.solana?.isPhantom) {
        // Show hint if they try to connect without Phantom
        hint.style.display = 'block';
        return;
      }
      try {
        await window.solana.connect();
        // ... update UI with wallet address, etc.
      } catch (e) {
        // show error toast / message
        console.error('Connect failed:', e);
      }
    });
  }
</script>