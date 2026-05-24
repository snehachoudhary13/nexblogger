let currentUser = null;

async function loadCurrentUser() {
  if (!localStorage.getItem('nexblogger_token')) { currentUser=null; renderNav(); return; }
  try { currentUser = await api.get('/api/auth/me'); }
  catch { localStorage.removeItem('nexblogger_token'); currentUser=null; }
  renderNav();
}

function renderNav() {
  const r = document.getElementById('nav-right');
  r.innerHTML = currentUser
    ? `<button class="btn btn--ghost btn--sm" onclick="navigate('dashboard')">Dashboard</button>
       <div class="nav-avatar-wrap" onclick="toggleProfileMenu()" title="${esc(currentUser.name)}">
         <div class="avatar">${esc(currentUser.avatar||ini(currentUser.name))}</div>
         <div id="profile-menu" class="profile-dropdown hidden">
           <div class="profile-dropdown-header">
             <div class="avatar avatar--lg">${esc(currentUser.avatar||ini(currentUser.name))}</div>
             <div>
               <div style="font-weight:700;font-size:0.9rem">${esc(currentUser.name)}</div>
               <div style="font-size:0.75rem;color:var(--text-3)">${esc(currentUser.email)}</div>
             </div>
           </div>
           <div class="divider" style="margin:0.5rem 0"></div>
           <button class="dropdown-item" onclick="navigate('profile');closeProfileMenu()">👤 View profile</button>
           <button class="dropdown-item" onclick="navigate('dashboard');closeProfileMenu()">📋 Dashboard</button>
           <button class="dropdown-item" onclick="openCreateWs();closeProfileMenu()">+ New workspace</button>
           <div class="divider" style="margin:0.5rem 0"></div>
           <button class="dropdown-item" style="color:var(--error)" onclick="logout()">Sign out</button>
         </div>
       </div>`
    : `<button class="btn btn--ghost btn--sm" onclick="navigate('login')">Sign in</button>
       <button class="btn btn--primary btn--sm" onclick="navigate('register')">Sign up</button>`;
}

function toggleProfileMenu() {
  const m = document.getElementById('profile-menu');
  if (m) m.classList.toggle('hidden');
  setTimeout(() => {
    document.addEventListener('click', closeProfileMenu, { once: true });
  }, 10);
}
function closeProfileMenu() {
  document.getElementById('profile-menu')?.classList.add('hidden');
}

function logout() {
  localStorage.removeItem('nexblogger_token');
  currentUser = null;
  renderNav();
  navigate('home');
  toast('Signed out', 'info');
}

/* ── Login ── */
function renderLogin() {
  setApp(`
    <div class="auth-wrap">
      <div class="auth-card glass stagger">
        <p class="form__title">Welcome back ✦</p>
        <div class="form-group"><label>Email</label><input class="form-input" id="l-email" type="email" placeholder="you@example.com"/></div>
        <div class="form-group"><label>Password</label><input class="form-input" id="l-pass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"/></div>
        <p class="form__error" id="l-err"></p>
        <button class="btn btn--primary" style="width:100%;margin-top:0.5rem" onclick="doLogin()">Sign in →</button>
        <p class="auth-toggle">No account? <a onclick="navigate('register')">Create one free</a></p>
      </div>
    </div>`);
}

async function doLogin() {
  const email=val('l-email'), password=val('l-pass'), err=document.getElementById('l-err');
  err.textContent='';
  try {
    const r = await api.post('/api/auth/login',{email,password});
    localStorage.setItem('nexblogger_token',r.token);
    currentUser=r.user; renderNav();
    navigate('dashboard');
    toast(`Welcome back, ${r.user.name}! ✦`,'success');
  } catch(e){ err.textContent=e.message; }
}

/* ── Register ── */
function renderRegister() {
  setApp(`
    <div class="auth-wrap">
      <div class="auth-card glass stagger">
        <p class="form__title">Join NexBlogger ✦</p>
        <div class="form-group"><label>Your name</label><input class="form-input" id="r-name" type="text" placeholder="Aditya Kumar"/></div>
        <div class="form-group"><label>Email</label><input class="form-input" id="r-email" type="email" placeholder="you@example.com"/></div>
        <div class="form-group"><label>Password <span>(min 6 chars)</span></label><input class="form-input" id="r-pass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')doRegister()"/></div>
        <p class="form__error" id="r-err"></p>
        <button class="btn btn--primary" style="width:100%;margin-top:0.5rem" onclick="doRegister()">Create account →</button>
        <p class="auth-toggle">Already a member? <a onclick="navigate('login')">Sign in</a></p>
      </div>
    </div>`);
}

async function doRegister() {
  const name=val('r-name'),email=val('r-email'),password=val('r-pass');
  const err=document.getElementById('r-err'); err.textContent='';
  try {
    const r=await api.post('/api/auth/register',{name,email,password});
    localStorage.setItem('nexblogger_token',r.token);
    currentUser=r.user; renderNav();
    navigate('dashboard');
    toast(`Welcome to NexBlogger, ${r.user.name}! ✦`,'success');
  } catch(e){ err.textContent=e.message; }
}

// ─── Profile Page (Medium/Reddit style) ──────────────────────
async function renderProfile() {
  if (!currentUser) { navigate('login'); return; }
  setApp(`<div style="display:flex;justify-content:center;align-items:center;min-height:60vh"><div class="spinner-ring"></div></div>`);
  try {
    const [me, myWs, allWs] = await Promise.all([
      api.get('/api/auth/me'),
      api.get('/api/workspaces/mine'),
      api.get('/api/workspaces'),
    ]);
    const joined  = myWs.filter(w => w.ownerId !== me.id);
    const owned   = myWs.filter(w => w.ownerId === me.id);
    const totalPosts  = owned.reduce((a,w)=>a+w.postCount,0) + joined.reduce((a,w)=>a+w.postCount,0);
    const totalPolls  = owned.reduce((a,w)=>a+w.pollCount,0);
    const memberSince = new Date(me.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'});

    setApp(`
      <div class="profile-wrap">
        <!-- Banner -->
        <div class="profile-banner">
          <div class="profile-banner-grad"></div>
        </div>
        <!-- Card -->
        <div class="page" style="max-width:860px;padding-top:0;position:relative;z-index:2">
          <div class="profile-card glass">
            <div class="profile-top">
              <div class="profile-avatar-wrap">
                <div class="profile-avatar">${esc(me.avatar||ini(me.name))}</div>
                <div class="profile-online-dot"></div>
              </div>
              <div class="profile-info">
                <h1 class="profile-name">${esc(me.name)}</h1>
                <p class="profile-handle">@${esc(me.email.split('@')[0])}</p>
                <p class="profile-since">Member since ${memberSince}</p>
              </div>
              <button class="btn btn--ghost btn--sm" onclick="openEditProfile()" style="margin-left:auto;align-self:flex-start">Edit profile</button>
            </div>
            <div class="profile-stats">
              <div class="profile-stat">
                <span class="profile-stat-num">${myWs.length}</span>
                <span class="profile-stat-lbl">Workspaces</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-num">${owned.length}</span>
                <span class="profile-stat-lbl">Created</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-num">${joined.length}</span>
                <span class="profile-stat-lbl">Joined</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-num">${totalPolls}</span>
                <span class="profile-stat-lbl">Polls</span>
              </div>
            </div>
          </div>

          <!-- Content grid -->
          <div class="profile-grid">
            <!-- Left: Your workspaces -->
            <div class="profile-main">
              <div class="profile-section-head">
                <span class="profile-section-icon">🏗</span>
                <span>Workspaces you own</span>
                <button class="btn btn--primary btn--sm" style="margin-left:auto" onclick="openCreateWs()">+ New</button>
              </div>
              ${owned.length ? `<div class="stagger">${owned.map(w=>`
                <div class="profile-ws-row card card--clickable" onclick="navigate('workspace','${w.slug}')">
                  <div class="profile-ws-icon">${w.name.slice(0,2).toUpperCase()}</div>
                  <div class="profile-ws-info">
                    <div class="profile-ws-name">${esc(w.name)}</div>
                    <div class="profile-ws-meta">${w.memberCount} members · ${w.postCount} posts · ${w.fileCount} files</div>
                  </div>
                  <span class="tag tag--${w.type}">${w.type}</span>
                </div>`).join('')}</div>`
              : `<div class="empty" style="padding:2rem"><div class="empty__icon">🏗</div><div class="empty__title">No workspaces yet</div><div class="empty__sub">Create one to get started!</div></div>`}

              ${joined.length ? `
                <div class="profile-section-head" style="margin-top:1.5rem">
                  <span class="profile-section-icon">👥</span>
                  <span>Workspaces you joined</span>
                </div>
                <div class="stagger">${joined.map(w=>`
                  <div class="profile-ws-row card card--clickable" onclick="navigate('workspace','${w.slug}')">
                    <div class="profile-ws-icon" style="background:rgba(244,114,182,0.15);color:var(--pink)">${w.name.slice(0,2).toUpperCase()}</div>
                    <div class="profile-ws-info">
                      <div class="profile-ws-name">${esc(w.name)}</div>
                      <div class="profile-ws-meta">by ${esc(w.ownerName)} · ${w.memberCount} members</div>
                    </div>
                    <span class="tag tag--${w.type}">${w.type}</span>
                  </div>`).join('')}
                </div>` : ''}
            </div>

            <!-- Right sidebar -->
            <div class="profile-sidebar">
              <div class="card" style="margin-bottom:1rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text-2);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.06em">Account</div>
                <div class="profile-detail-row"><span>📧</span><span>${esc(me.email)}</span></div>
                <div class="profile-detail-row"><span>🆔</span><span style="font-family:monospace;font-size:0.78rem">${me.id.slice(0,12)}…</span></div>
                <div class="profile-detail-row"><span>📅</span><span>${memberSince}</span></div>
              </div>
              <div class="card">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text-2);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.06em">Quick actions</div>
                <div style="display:flex;flex-direction:column;gap:0.5rem">
                  <button class="btn btn--primary" style="width:100%;justify-content:center" onclick="openCreateWs()">+ Create workspace</button>
                  <button class="btn btn--ghost" style="width:100%;justify-content:center" onclick="navigate('home')">🌐 Explore workspaces</button>
                  <button class="btn btn--ghost" style="width:100%;justify-content:center" onclick="navigate('dashboard')">📋 My dashboard</button>
                  <div class="divider"></div>
                  <button class="btn btn--danger" style="width:100%;justify-content:center" onclick="logout()">Sign out</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`);
  } catch(e) {
    setApp(`<div class="page page--sm" style="padding-top:5rem;text-align:center"><p style="color:var(--error)">${esc(e.message)}</p></div>`);
  }
}

function openEditProfile() {
  openModal(`
    <p class="form__title">Edit profile</p>
    <div class="form-group"><label>Display name</label><input class="form-input" id="ep-name" value="${esc(currentUser?.name||'')}"/></div>
    <p style="font-size:0.82rem;color:var(--text-3);margin-top:0.5rem">More profile options coming soon.</p>
    <p class="form__error" id="ep-err"></p>
    <button class="btn btn--primary" style="width:100%;margin-top:1rem" onclick="toast('Profile update coming soon!','info');closeModal()">Save changes</button>`);
}
