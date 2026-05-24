let allWs = [], currentWs = null, currentTab = 'posts';

/* ── Home ── */
function renderHome() {
  setApp(`
    <div class="hero">
      <span class="hero__badge">⬡ NexBlogger Platform</span>
      <h1 class="hero__title">Where communities<br/><span class="grad">share & grow</span></h1>
      <p class="hero__sub">Create workspaces, share posts, files, and polls. Invite anyone with a link.</p>
      <div class="hero__actions">
        ${currentUser
          ? `<button class="btn btn--primary btn--lg" onclick="openCreateWs()">+ Create Workspace</button>
             <button class="btn btn--ghost btn--lg" onclick="navigate('dashboard')">My Dashboard →</button>`
          : `<button class="btn btn--primary btn--lg" onclick="navigate('register')">Get started free</button>
             <button class="btn btn--ghost btn--lg" onclick="navigate('login')">Sign in →</button>`}
      </div>
      <div class="hero__features">
        <div class="hero__feat"><div class="hero__feat-icon">📝</div><div class="hero__feat-label">Posts & Discussions</div></div>
        <div class="hero__feat"><div class="hero__feat-icon">📎</div><div class="hero__feat-label">File Sharing</div></div>
        <div class="hero__feat"><div class="hero__feat-icon">📊</div><div class="hero__feat-label">Polls & Votes</div></div>
        <div class="hero__feat"><div class="hero__feat-icon">🔒</div><div class="hero__feat-label">Public & Private</div></div>
        <div class="hero__feat"><div class="hero__feat-icon">🔗</div><div class="hero__feat-label">Shareable Links</div></div>
      </div>
    </div>
    <div class="page">
      <div class="page__header">
        <div><p class="page__title">Explore workspaces</p><p class="page__sub">Join any public community</p></div>
        ${currentUser?`<button class="btn btn--primary" onclick="openCreateWs()">+ New Workspace</button>`:''}
      </div>
      <div id="ws-grid">${skeletonGrid()}</div>
    </div>`);
  loadPublicWs();
}

async function loadPublicWs() {
  try {
    allWs = await api.get('/api/workspaces');
    renderWsGrid(allWs,'ws-grid');
  } catch(e) {
    byId('ws-grid').innerHTML=`<p style="color:var(--error)">${esc(e.message)}</p>`;
  }
}

function renderWsGrid(list, id) {
  const el=byId(id); if(!el) return;
  if(!list.length) { el.innerHTML=`<div class="empty"><div class="empty__icon">🌐</div><div class="empty__title">No workspaces yet</div><div class="empty__sub">Be the first to create one!</div></div>`; return; }
  el.innerHTML=`<div class="grid stagger">${list.map(wsCard).join('')}</div>`;
}

function wsCard(w) {
  return `<div class="card card--clickable" onclick="navigate('workspace','${w.slug}')">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.75rem">
      <h3 style="font-size:1.05rem;font-weight:700;line-height:1.3">${esc(w.name)}</h3>
      <span class="tag tag--${w.type}">${w.type}</span>
    </div>
    <p style="color:var(--text-3);font-size:0.88rem;line-height:1.5;margin-bottom:1rem">${esc(w.description||'No description')}</p>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
      <span class="tag tag--stat">👥 ${w.memberCount}</span>
      <span class="tag tag--stat">📝 ${w.postCount}</span>
      <span class="tag tag--stat">📊 ${w.pollCount}</span>
      <span class="tag tag--stat">📎 ${w.fileCount}</span>
    </div>
    <p style="font-size:0.75rem;color:var(--text-3);margin-top:0.85rem">by ${esc(w.ownerName)}</p>
  </div>`;
}

function searchWorkspaces(q) {
  if(!allWs.length) return;
  const f=q.toLowerCase();
  renderWsGrid(allWs.filter(w=>w.name.toLowerCase().includes(f)||(w.description||'').toLowerCase().includes(f)),'ws-grid');
}

/* ── Dashboard ── */
async function renderDashboard() {
  if(!currentUser){navigate('login');return;}
  setApp(`
    <div class="page">
      <div class="page__header">
        <div><p class="page__title">My Workspaces</p><p class="page__sub">Everything you own or joined</p></div>
        <button class="btn btn--primary" onclick="openCreateWs()">+ New Workspace</button>
      </div>
      <div id="dash-grid">${skeletonGrid()}</div>
    </div>`);
  try {
    const list=await api.get('/api/workspaces/mine');
    renderWsGrid(list,'dash-grid');
  } catch(e){byId('dash-grid').innerHTML=`<p style="color:var(--error)">${esc(e.message)}</p>`;}
}

/* ── Create workspace ── */
function openCreateWs() {
  if(!currentUser){navigate('login');return;}
  openModal(`
    <p class="form__title">New Workspace ✦</p>
    <div class="form-group"><label>Name</label><input class="form-input" id="ws-name" placeholder="e.g. DevOps India"/></div>
    <div class="form-group"><label>Description</label><textarea class="form-input" id="ws-desc" placeholder="What is this workspace about?" rows="3"></textarea></div>
    <div class="form-group"><label>Visibility</label>
      <select class="form-input" id="ws-type">
        <option value="public">🌐 Public — anyone can join</option>
        <option value="private">🔒 Private — invite link only</option>
      </select>
    </div>
    <p class="form__error" id="ws-err"></p>
    <button class="btn btn--primary" style="width:100%" onclick="doCreateWs()">Create workspace →</button>`);
}

async function doCreateWs() {
  const name=val('ws-name'),description=val('ws-desc'),type=byId('ws-type').value;
  const err=byId('ws-err'); err.textContent='';
  if(!name){err.textContent='Name is required';return;}
  try {
    const ws=await api.post('/api/workspaces',{name,description,type});
    closeModal(); toast('Workspace created! ✦','success');
    navigate('workspace',ws.slug);
  } catch(e){err.textContent=e.message;}
}

/* ── Single workspace ── */
async function renderWorkspace(slug) {
  setApp(`<div style="display:flex;justify-content:center;align-items:center;height:60vh"><div class="spinner-ring"></div></div>`);
  try {
    currentWs=await api.get(`/api/workspaces/${slug}`);
    buildWsPage(currentWs);
    switchTab('posts');
  } catch(e){
    setApp(`<div class="page page--sm" style="padding-top:5rem;text-align:center">
      <p style="color:var(--error);font-size:1.1rem">${esc(e.message)}</p>
      <button class="btn btn--ghost" style="margin-top:1.5rem" onclick="navigate('home')">← Back home</button>
    </div>`);
  }
}

function buildWsPage(ws) {
  const shareUrl=`${location.origin}/workspace/${ws.slug}`;
  document.getElementById('app').innerHTML=`
    <div class="ws-header">
      <div class="ws-header__inner">
        <span class="back-link" onclick="navigate('home')">← All workspaces</span>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
          <div>
            <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.5rem">
              <h1 class="ws-title">${esc(ws.name)}</h1>
              <span class="tag tag--${ws.type}">${ws.type}</span>
            </div>
            <p class="ws-desc">${esc(ws.description||'')}</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap">
            ${ws.isMember&&currentUser
              ? `<button class="btn btn--primary btn--sm" onclick="openCreatePost()">+ Post</button>
                 <button class="btn btn--ghost btn--sm" onclick="openCreatePoll()">+ Poll</button>
                 <button class="btn btn--ghost btn--sm" onclick="switchTab('files')">+ Upload</button>`
              : currentUser
                ? `<button class="btn btn--primary btn--sm" onclick="joinWs('${ws.slug}')">Join workspace</button>`
                : `<button class="btn btn--primary btn--sm" onclick="navigate('register')">Sign up to join</button>`}
          </div>
        </div>
        <div class="ws-stats">
          <div class="ws-stat"><div class="ws-stat__num">${ws.memberCount}</div><div class="ws-stat__lbl">Members</div></div>
          <div class="ws-stat"><div class="ws-stat__num">${ws.postCount}</div><div class="ws-stat__lbl">Posts</div></div>
          <div class="ws-stat"><div class="ws-stat__num">${ws.pollCount}</div><div class="ws-stat__lbl">Polls</div></div>
          <div class="ws-stat"><div class="ws-stat__num">${ws.fileCount}</div><div class="ws-stat__lbl">Files</div></div>
        </div>
        <div class="share-banner" style="margin-top:1.25rem">
          <span style="font-size:0.8rem;color:var(--text-3)">🔗 Share</span>
          <span class="share-banner__url">${shareUrl}</span>
          <button class="btn btn--ghost btn--sm" onclick="copyLink('${shareUrl}')">Copy</button>
        </div>
      </div>
    </div>
    <div class="ws-tabs">
      <button class="ws-tab" id="tab-posts"   onclick="switchTab('posts')">📝 Posts</button>
      <button class="ws-tab" id="tab-polls"   onclick="switchTab('polls')">📊 Polls</button>
      <button class="ws-tab" id="tab-files"   onclick="switchTab('files')">📎 Files</button>
      <button class="ws-tab" id="tab-members" onclick="switchTab('members')">👥 Members</button>
    </div>
    <div class="ws-body" id="ws-body"></div>`;
}

function switchTab(tab) {
  currentTab=tab;
  document.querySelectorAll('.ws-tab').forEach(t=>t.classList.remove('active'));
  byId(`tab-${tab}`)?.classList.add('active');
  if(tab==='posts')   loadPosts(currentWs.slug);
  if(tab==='polls')   loadPolls(currentWs.slug);
  if(tab==='files')   loadFiles(currentWs.slug);
  if(tab==='members') loadMembers(currentWs.slug);
}

async function joinWs(slug) {
  if(!currentUser){navigate('login');return;}
  try {
    const r=await api.post(`/api/workspaces/${slug}/join`);
    currentWs=r.workspace; buildWsPage(currentWs); switchTab('posts');
    toast('Joined! ✦','success');
  } catch(e){toast(e.message,'error');}
}

async function loadMembers(slug) {
  setBody(`<div style="display:flex;justify-content:center;padding:2rem"><div class="spinner-ring"></div></div>`);
  try {
    const members=await api.get(`/api/workspaces/${slug}/members`);
    setBody(`<div style="max-width:600px" class="stagger">${members.map(m=>`
      <div class="member-row">
        <div class="avatar avatar--lg">${esc(m.avatar||ini(m.name))}</div>
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="member-name">${esc(m.name)}</span>
            ${m.isOwner?'<span class="owner-badge">owner</span>':''}
          </div>
          <div class="member-sub">Joined ${timeAgo(m.joinedAt)}</div>
        </div>
      </div>`).join('')}</div>`);
  } catch(e){setBody(`<p style="color:var(--error)">${esc(e.message)}</p>`);}
}

