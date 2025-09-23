<!-- firebaseConfig.js — v9 COMPAT + App Check (stable) -->
<script type="module">
  /***** 1) Load compat SDKs in a fixed order *****/
  import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
  import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
  import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
  import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js';
  import 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-check-compat.js';

  /***** 2) Project config (your live values) *****/
  const firebaseConfig = {
    apiKey: "AIzaSyCLLrOx4jWJ1PN8xFFxNhIryx3NshADKVY",
    authDomain: "lovebutton-heaven.firebaseapp.com",
    projectId: "lovebutton-heaven",
    storageBucket: "lovebutton-heaven.firebasestorage.app",
    messagingSenderId: "1079456151721",
    appId: "1:1079456151721:web:15d2aa1171d977da8c11b8",
    measurementId: "G-0261HYV08P"
  };

  // Quick guard: make sure global 'firebase' exists (compat builds expose this)
  if (typeof firebase === 'undefined') {
    throw new Error('[firebaseConfig] Global "firebase" not found. Ensure the compat <script> URLs loaded.');
  }

  /***** 3) Initialize Firebase (once) *****/
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('[firebaseConfig] App initialized:', firebase.app().name);
  } else {
    console.log('[firebaseConfig] Re-using existing app:', firebase.app().name);
  }

  // Optional: keep Firestore forgiving on undefined fields
  try { firebase.firestore().settings({ ignoreUndefinedProperties: true }); } catch {}

  /***** 4) App Check *****/
  // If you set a debug token in your HTML before this file loads:
  //   window.FIREBASE_APPCHECK_DEBUG_TOKEN = 'YOUR_DEBUG_TOKEN'  (or true to auto-generate)
  // Firebase will pick it up automatically.
  const RECAPTCHA_V3_SITE_KEY = '6LflFNArAAAAACERAJI4nDTJtsKgsfjWN8DTKNVe'; // your key

  let appCheckInstance = null;
  try {
    appCheckInstance = firebase.appCheck();
    // Enable auto refresh + use reCAPTCHA v3
    appCheckInstance.activate(RECAPTCHA_V3_SITE_KEY, /* isTokenAutoRefreshEnabled */ true);
    console.log('[firebaseConfig] App Check activated (reCAPTCHA v3).');
  } catch (e) {
    console.warn('[firebaseConfig] App Check activate() failed (likely not enabled yet):', e?.message || e);
  }

  /***** 5) Ensure an auth session (anonymous allowed) *****/
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      try {
        await firebase.auth().signInAnonymously();
        console.log('[firebaseConfig] Signed in anonymously.');
      } catch (e) {
        console.error('[firebaseConfig] Anonymous sign-in failed:', e);
      }
    }
  });

  /***** 6) Expose handles for other modules *****/
  // Attach to window so any script can import-free access these (handy in plain HTML sites)
  window.fbApp      = firebase.app();
  window.fbAuth     = firebase.auth();
  window.db         = firebase.firestore();
  window.storage    = firebase.storage();
  window.fbAppCheck = appCheckInstance;

  console.log('[firebaseConfig] Ready. projectId=', firebase.app().options.projectId);
</script>
