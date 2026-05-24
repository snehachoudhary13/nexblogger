// ─── Core UI functions — available to all scripts ────────────

function setApp(html) {
  document.getElementById('app').innerHTML = html;
}

function setBody(html) {
  const b = document.getElementById('ws-body');
  if (b) b.innerHTML = html;
}

// ─── Toast notifications ──────────────────────────────────────
function toast(msg, type = '') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 350);
  }, 3200);
}

// ─── Modal ────────────────────────────────────────────────────
function openModal(html) {
  const body = document.getElementById('modal-body');
  const overlay = document.getElementById('modal-overlay');
  if (!body || !overlay) return;
  body.innerHTML = html;
  overlay.classList.remove('hidden');
  setTimeout(() => overlay.querySelector('input, textarea')?.focus(), 60);
}

function closeModal(e) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  if (e && e.target !== overlay) return;
  overlay.classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// ─── Page transition + router ─────────────────────────────────
let _transitioning = false;

function navigate(page, param, skipTransition = false) {
  if (_transitioning) return;

  const run = () => {
    if      (page === 'home')      { history.pushState({}, '', '/');                   renderHome(); }
    else if (page === 'login')     { history.pushState({}, '', '/login');              renderLogin(); }
    else if (page === 'register')  { history.pushState({}, '', '/register');           renderRegister(); }
    else if (page === 'dashboard') { history.pushState({}, '', '/dashboard');          renderDashboard(); }
    else if (page === 'workspace') { history.pushState({}, '', `/workspace/${param}`); renderWorkspace(param); }
    else if (page === 'poll')      { history.pushState({}, '', `/poll/${param}`);      renderStandalonePoll(param); }
    else if (page === 'profile')   { history.pushState({}, '', '/profile');             renderProfile(); }
    else renderHome();
  };

  if (skipTransition) { run(); return; }

  const t = document.getElementById('page-transition');
  _transitioning = true;
  t.classList.add('slide-in');
  setTimeout(() => {
    run();
    t.classList.remove('slide-in');
    t.classList.add('slide-out');
    setTimeout(() => { t.classList.remove('slide-out'); _transitioning = false; }, 350);
  }, 180);
}

// ─── Keyboard shortcuts ───────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay')?.classList.add('hidden');
    closeLightbox();
  }
});

// ─── Lightbox ─────────────────────────────────────────────────
function openLightbox(src) {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.add('hidden');
  document.body.style.overflow = '';
}
