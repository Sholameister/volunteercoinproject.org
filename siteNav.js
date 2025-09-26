// siteNav.js — fixed bottom-left quick nav used across pages
(function(){
  const css = `
  .lb-dock{position:fixed;left:14px;bottom:14px;z-index:10000;display:flex;gap:8px;flex-wrap:wrap}
  .lb-dock a{background:#e60073;color:#fff;padding:8px 12px;border-radius:8px;
             text-decoration:none;font:600 14px/1.1 system-ui,Segoe UI,sans-serif;
             box-shadow:0 2px 8px rgba(0,0,0,.15)}
  .lb-dock a:hover{background:#cc005f}
  @media (max-width:480px){ .lb-dock{left:10px;right:10px;gap:6px}
    .lb-dock a{flex:1;text-align:center}}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const dock = document.createElement('div'); dock.className = 'lb-dock';
  dock.innerHTML = `
    <a href="http://./signup.html" rel="noopener" target="_blank" rel="noopener">KYC & Signup</a>
    <a href="http://./login.html"  rel="noopener" target="_blank" rel="noopener">Login</a>
    <a href="http://./dashboard.html" rel="noopener" target="_blank" rel="noopener">Dashboard</a>
    <a href="http://./index.html"  rel="noopener" target="_blank" rel="noopener">Home</a>
  `;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(dock));
})();
