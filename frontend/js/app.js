// ─── app.js — boot only. All helpers are in utils.js and core.js ──

function routeFromURL() {
  const p = location.pathname;
  if      (p === '/' || p === '')           renderHome();
  else if (p === '/login')                  renderLogin();
  else if (p === '/register')               renderRegister();
  else if (p === '/dashboard')              renderDashboard();
  else if (p.startsWith('/workspace/'))     renderWorkspace(p.split('/workspace/')[1]);
  else if (p.startsWith('/poll/'))          renderStandalonePoll(p.split('/poll/')[1]);
  else if (p === '/profile')                renderProfile();
  else                                      renderHome();
}

window.addEventListener('popstate', () => routeFromURL());

// Inject spinner CSS
const _s = document.createElement('style');
_s.textContent = `.spinner-ring{width:36px;height:36px;border-radius:50%;border:3px solid rgba(139,92,246,0.15);border-top-color:var(--violet-400);animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`;
document.head.appendChild(_s);

// ─── Boot ────────────────────────────────────────────────────
(async () => {
  await loadCurrentUser();
  routeFromURL();
})();
