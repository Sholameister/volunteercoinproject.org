let selectedProvider = null;
let cachedAddress = null;

function httpsAllowed() {
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

function toBase58Maybe(x) {
  try {
    if (!x) return null;
    if (typeof x === 'string') return x;
    if (x.publicKey && typeof x.publicKey.toBase58 === 'function') return x.publicKey.toBase58();
    if (typeof x.toBase58 === 'function') return x.toBase58();
    if (x.toString) return x.toString();
  } catch(_) {}
  return null;
}

function detectProviders() {
  const list = [];
  const phantom = (window?.phantom?.solana && window.phantom.solana.isPhantom) ? window.phantom.solana
                 : (window?.solana?.isPhantom ? window.solana : null);
  if (phantom) list.push({ id:'phantom', name:'Phantom', provider:phantom });

  const solflare = window?.solflare?.isSolflare ? window.solflare : null;
  if (solflare) list.push({ id:'solflare', name:'Solflare', provider:solflare });

  const backpack = window?.backpack?.solana ? window.backpack.solana : null;
  if (backpack) list.push({ id:'backpack', name:'Backpack', provider:backpack });

  const glow = window?.glow?.solana ? window.glow.solana : null;
  if (glow) list.push({ id:'glow', name:'Glow', provider:glow });

  const exodus = window?.exodus?.solana ? window.exodus.solana : null;
  if (exodus) list.push({ id:'exodus', name:'Exodus', provider:exodus });

  const trust = window?.trustwallet?.solana ? window.trustwallet.solana : null;
  if (trust) list.push({ id:'trust', name:'Trust Wallet', provider:trust });

  return list;
}

function chooseProvider(detected) {
  if (detected.length === 0) return null;
  if (detected.length === 1) return detected[0];
  const menu = detected.map((w,i)=>`${i+1}) ${w.name}`).join('\n');
  const choice = prompt(`Select a wallet to connect:\n${menu}\n\n(Enter number)`);
  const idx = Number(choice) - 1;
  return (Number.isInteger(idx) && idx >= 0 && idx < detected.length) ? detected[idx] : detected[0];
}

function withTimeout(promise, ms, label='operation') {
  let t; const timeout = new Promise((_,rej)=>{ t=setTimeout(()=>rej(new Error(`${label} timed out`)), ms); });
  return Promise.race([promise.finally(()=>clearTimeout(t)), timeout]);
}

export async function connectWallet() {
  if (!httpsAllowed()) {
    alert('Wallet requires HTTPS or localhost.');
    return null;
  }

  const detected = detectProviders();
  if (detected.length === 0) {
    alert('No Solana wallet detected here. On mobile, open this page inside your wallet app’s browser (e.g., Phantom → Browser tab).');
    return null;
  }

  const picked = chooseProvider(detected);
  const provider = picked.provider;
  selectedProvider = provider;

  // Connect (give up after 7s)
  try {
    if (typeof provider.connect === 'function') {
      await withTimeout(provider.connect(), 7000, 'wallet connect');
    }
  } catch (e) {
    console.error('connect() failed:', e);
    alert(`Wallet connection failed: ${e?.message || e}`);
    return null;
  }

  let pk = toBase58Maybe(provider.publicKey) || toBase58Maybe(provider.account);
  if (!pk && typeof provider.request === 'function') {
    try {
      const res = await withTimeout(provider.request({ method:'connect' }), 5000, 'wallet request');
      pk = toBase58Maybe(res?.publicKey) || toBase58Maybe(provider.publicKey);
    } catch (e) { /* ignore */ }
  }

  if (!pk) {
    alert('Connected, but no public key returned. Try removing this site from your wallet’s Connected apps, then reconnect.');
    return null;
  }

  cachedAddress = pk;

  // optional listeners
  try {
    provider.on?.('disconnect', ()=>console.log('Wallet disconnected'));
    provider.on?.('accountChanged', (a)=>console.log('Account changed:', a));
  } catch(_) {}

  const slot = document.getElementById('walletAddress') || document.getElementById('walletDisplay') || document.getElementById('signupWalletDisplay');
  if (slot) slot.textContent = `Wallet: ${pk}`;

  return pk;
}

export function getWalletAddress() {
  return cachedAddress || toBase58Maybe(selectedProvider?.publicKey) || null;
}
