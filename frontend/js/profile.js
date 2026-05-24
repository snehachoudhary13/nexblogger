// ─── Profile Page ─────────────────────────────────────────────

async function renderProfile() {
  if (!currentUser) { navigate('login'); return; }
  setApp(`<div class="loading-full"><div class="spinner-ring"></div></div>`);
  try {
    const profile = await api.get('/api/profile');
    buildProfilePage(profile);
  } catch(e) {
    setApp(`<div class="page page--sm" style="padding-top:4rem;text-align:center">
      <p style="color:var(--error)">${esc(e.message)}</p></div>`);
  }
}

function buildProfilePage(p) {
  const joined = new Date(p.createdAt).toLocaleDateString('en-IN', { year:'numeric', month:'long' });
  setApp(`
    <div class="profile-root">
      <div class="profile-cover"></div>
      <div class="profile-header-wrap">
        <div class="profile-header page">
          <div class="profile-avatar-lg">${esc(p.avatar || ini(p.name))}</div>
          <div class="profile-info">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
              <div>
                <h1 class="profile-name">${esc(p.name)}</h1>
                <p class="profile-email">${esc(p.email)}</p>
                <p class="profile-bio" id="profile-bio-txt">${p.bio ? esc(p.bio) : '<span style="color:var(--text3);font-style:italic">No bio yet — add one to tell the community about yourself</span>'}</p>
                <p class="profile-joined">Member since ${joined}</p>
              </div>
              <button class="btn btn--ghost btn--sm" onclick="openEditProfile(${JSON.stringify(p).split('"').join('&quot;')})">
                ✏ Edit profile
              </button>
            </div>
            <div class="profile-stats">
              <div class="pstat"><span class="pstat-num">${p.stats.workspaces}</span><span class="pstat-lbl">Workspaces</span></div>
              <div class="pstat"><span class="pstat-num">${p.stats.posts}</span><span class="pstat-lbl">Posts</span></div>
              <div class="pstat"><span class="pstat-num">${p.stats.comments}</span><span class="pstat-lbl">Comments</span></div>
              <div class="pstat"><span class="pstat-num">${p.stats.polls}</span><span class="pstat-lbl">Polls</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-tabs-bar">
        <div class="page" style="padding-top:0;padding-bottom:0;display:flex;gap:0">
          <button class="prf-tab active" id="ptab-overview"  onclick="switchProfileTab('overview',this)">Overview</button>
          <button class="prf-tab" id="ptab-posts"     onclick="switchProfileTab('posts',this)">Posts</button>
          <button class="prf-tab" id="ptab-workspaces" onclick="switchProfileTab('workspaces',this)">Workspaces</button>
          <button class="prf-tab" id="ptab-settings"  onclick="switchProfileTab('settings',this)">Settings</button>
        </div>
      </div>

      <div class="page profile-body" id="profile-tab-body"></div>
    </div>`);

  // store profile data for tab switching
  window._profileData = p;
  switchProfileTab('overview', document.getElementById('ptab-overview'));
}

function switchProfileTab(tab, btn) {
  document.querySelectorAll('.prf-tab').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');
  const p = window._profileData;
  const body = document.getElementById('profile-tab-body');
  if (!body) return;

  if (tab === 'overview') {
    body.innerHTML = `
      <div class="profile-two-col">
        <div class="profile-main">
          <h2 class="profile-section-title">Recent posts</h2>
          ${p.recentPosts.length
            ? p.recentPosts.map(post => `
              <div class="prf-post-card card card--clickable" onclick="navigate('workspace','${post.workspaceSlug}')">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.6rem">
                  <span class="tag tag--stat" style="font-size:0.72rem">📂 ${esc(post.workspaceName)}</span>
                  <span style="font-size:0.75rem;color:var(--text-3)">${timeAgo(post.createdAt)}</span>
                </div>
                <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.4rem;line-height:1.3">${esc(post.title)}</h3>
                <p style="font-size:0.88rem;color:var(--text-2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(post.body)}</p>
                <div style="margin-top:0.6rem"><span class="tag tag--stat">💬 ${post.commentCount}</span></div>
              </div>`).join('')
            : `<div class="empty"><div class="empty__icon">📝</div><div class="empty__title">No posts yet</div><div class="empty__sub">Join a workspace and share your first post</div></div>`
          }
        </div>
        <div class="profile-sidebar">
          <div class="card" style="margin-bottom:1rem">
            <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:1rem;color:var(--text-2)">Your workspaces</h3>
            ${p.workspaces.slice(0,5).map(w => `
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;cursor:pointer" onclick="navigate('workspace','${w.slug}')">
                <div>
                  <div style="font-size:0.9rem;font-weight:600">${esc(w.name)}</div>
                  <div style="font-size:0.75rem;color:var(--text-3)">${w.memberCount} members</div>
                </div>
                <span class="tag tag--${w.type}">${w.type}</span>
              </div>`).join('') || `<p style="font-size:0.85rem;color:var(--text-3)">No workspaces yet</p>`}
            ${p.workspaces.length > 5 ? `<button class="btn btn--ghost btn--sm" style="width:100%;margin-top:0.5rem" onclick="switchProfileTab('workspaces',document.getElementById('ptab-workspaces'))">See all ${p.workspaces.length} →</button>` : ''}
          </div>
          <div class="card">
            <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:0.75rem;color:var(--text-2)">Activity summary</h3>
            ${[
              ['📝', 'Posts written', p.stats.posts],
              ['💬', 'Comments made', p.stats.comments],
              ['📊', 'Polls created', p.stats.polls],
              ['🗳', 'Polls voted in', p.stats.votes],
            ].map(([icon,lbl,val]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)">
                <span style="font-size:0.85rem;color:var(--text-2)">${icon} ${lbl}</span>
                <span style="font-size:0.9rem;font-weight:700;color:var(--violet-300)">${val}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }

  if (tab === 'posts') {
    body.innerHTML = `
      <div style="max-width:720px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h2 class="profile-section-title" style="margin-bottom:0">All posts (${p.recentPosts.length})</h2>
          <button class="btn btn--primary btn--sm" onclick="navigate('dashboard')">+ New Post</button>
        </div>
        ${p.recentPosts.length
          ? p.recentPosts.map(post => `
            <div class="prf-post-card card card--clickable" style="margin-bottom:0.85rem" onclick="navigate('workspace','${post.workspaceSlug}')">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
                <span class="tag tag--stat">📂 ${esc(post.workspaceName)}</span>
                <span style="font-size:0.75rem;color:var(--text-3)">${timeAgo(post.createdAt)}</span>
              </div>
              <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:0.4rem">${esc(post.title)}</h3>
              <p style="font-size:0.88rem;color:var(--text-2);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(post.body)}</p>
              <div style="margin-top:0.6rem;display:flex;gap:0.5rem">
                <span class="tag tag--stat">💬 ${post.commentCount}</span>
              </div>
            </div>`).join('')
          : `<div class="empty"><div class="empty__icon">📝</div><div class="empty__title">No posts yet</div></div>`}
      </div>`;
  }

  if (tab === 'workspaces') {
    body.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h2 class="profile-section-title" style="margin-bottom:0">Workspaces (${p.workspaces.length})</h2>
          <button class="btn btn--primary btn--sm" onclick="openCreateWs()">+ Create workspace</button>
        </div>
        ${p.workspaces.length
          ? `<div class="grid stagger">${p.workspaces.map(w => `
              <div class="card card--clickable" onclick="navigate('workspace','${w.slug}')">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.6rem">
                  <h3 style="font-size:1rem;font-weight:700">${esc(w.name)}</h3>
                  <div style="display:flex;gap:0.4rem;flex-shrink:0">
                    ${w.isOwned ? '<span class="tag tag--stat" style="background:rgba(139,92,246,0.15);color:var(--violet-300)">owner</span>' : ''}
                    <span class="tag tag--${w.type}">${w.type}</span>
                  </div>
                </div>
                <p style="font-size:0.85rem;color:var(--text-3);margin-bottom:0.75rem">${esc(w.description||'No description')}</p>
                <div style="display:flex;gap:0.5rem">
                  <span class="tag tag--stat">👥 ${w.memberCount}</span>
                  <span class="tag tag--stat">📝 ${w.postCount}</span>
                </div>
              </div>`).join('')}</div>`
          : `<div class="empty"><div class="empty__icon">📂</div><div class="empty__title">No workspaces yet</div><div class="empty__sub">Create your first workspace or join a public one</div></div>`}
      </div>`;
  }

  if (tab === 'settings') {
    body.innerHTML = `
      <div style="max-width:600px">
        <h2 class="profile-section-title">Account settings</h2>
        <div class="card" style="margin-bottom:1.25rem">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem">Profile information</h3>
          <div class="form-group"><label>Display name</label><input class="form-input" id="s-name" value="${esc(p.name)}"/></div>
          <div class="form-group"><label>Bio <span>(shown on your profile)</span></label><textarea class="form-input" id="s-bio" rows="3" placeholder="Tell the community about yourself...">${esc(p.bio||'')}</textarea></div>
          <p class="form__error" id="s-info-err"></p>
          <button class="btn btn--primary" onclick="saveProfileInfo()">Save changes</button>
        </div>
        <div class="card" style="margin-bottom:1.25rem">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem">Change password</h3>
          <div class="form-group"><label>Current password</label><input class="form-input" id="s-cpwd" type="password" placeholder="••••••••"/></div>
          <div class="form-group"><label>New password <span>(min 6 chars)</span></label><input class="form-input" id="s-npwd" type="password" placeholder="••••••••"/></div>
          <p class="form__error" id="s-pwd-err"></p>
          <button class="btn btn--primary" onclick="savePassword()">Update password</button>
        </div>
        <div class="card" style="border-color:rgba(248,113,113,0.2)">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;color:var(--error)">Danger zone</h3>
          <p style="font-size:0.88rem;color:var(--text-3);margin-bottom:1rem">Sign out of all devices and clear your session.</p>
          <button class="btn btn--danger" onclick="logout()">Sign out</button>
        </div>
      </div>`;
  }
}

function openEditProfile(p) {
  openModal(`
    <p class="form__title">Edit Profile ✦</p>
    <div class="form-group"><label>Display name</label><input class="form-input" id="ep-name" value="${esc(p.name)}"/></div>
    <div class="form-group"><label>Bio</label><textarea class="form-input" id="ep-bio" rows="3" placeholder="Tell the community about yourself...">${esc(p.bio||'')}</textarea></div>
    <p class="form__error" id="ep-err"></p>
    <button class="btn btn--primary" style="width:100%" onclick="doEditProfile()">Save →</button>`);
}

async function doEditProfile() {
  const name = val('ep-name'), bio = val('ep-bio'), err = byId('ep-err');
  err.textContent = '';
  try {
    const updated = await api.post('/api/profile', { name, bio });
    // Patch the API post to be PATCH
    closeModal();
    toast('Profile updated! ✦', 'success');
    renderProfile();
  } catch(e) { err.textContent = e.message; }
}

async function saveProfileInfo() {
  const name = val('s-name'), bio = val('s-bio'), err = byId('s-info-err');
  err.textContent = '';
  try {
    await apiFetch('/api/profile', { method:'PATCH', body:{ name, bio } });
    currentUser.name = name;
    renderNav();
    toast('Profile updated! ✦', 'success');
    const p = await api.get('/api/profile');
    window._profileData = p;
  } catch(e) { err.textContent = e.message; }
}

async function savePassword() {
  const currentPassword = val('s-cpwd'), newPassword = val('s-npwd'), err = byId('s-pwd-err');
  err.textContent = '';
  if (!currentPassword || !newPassword) { err.textContent = 'Both fields required'; return; }
  try {
    await apiFetch('/api/profile', { method:'PATCH', body:{ currentPassword, newPassword } });
    byId('s-cpwd').value = ''; byId('s-npwd').value = '';
    toast('Password updated! ✦', 'success');
  } catch(e) { err.textContent = e.message; }
}
