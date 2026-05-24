async function loadPolls(slug) {
  setBody(`<div style="display:flex;justify-content:center;padding:2rem"><div class="spinner-ring"></div></div>`);
  try {
    const polls=await api.get(`/api/workspaces/${slug}/polls`);
    if(!polls.length){setBody(`<div class="empty"><div class="empty__icon">📊</div><div class="empty__title">No polls yet</div><div class="empty__sub">${currentWs?.isMember?'Create a poll to get the community voting!':''}</div></div>`);return;}
    setBody(`<div class="grid stagger">${polls.map(pollCard).join('')}</div>`);
  } catch(e){setBody(`<p style="color:var(--error)">${esc(e.message)}</p>`);}
}

function pollCard(p) {
  const shareUrl=`${location.origin}/poll/${p.id}`;
  const maxV=Math.max(...p.options.map(o=>o.votes),1);
  const canVote=currentWs?.isMember&&currentUser&&!p.myVote;
  return `<div class="card" id="poll-${p.id}">
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
      <div class="avatar" style="width:26px;height:26px;font-size:0.68rem">${esc(p.authorAvatar||'?')}</div>
      <span style="font-size:0.78rem;color:var(--text-3)">${esc(p.authorName)} · ${timeAgo(p.createdAt)}</span>
    </div>
    <p class="poll-question">${esc(p.question)}</p>
    <div id="popts-${p.id}">${p.options.map(o=>optHTML(o,p,maxV,canVote)).join('')}</div>
    <div class="poll-footer">
      <span>${p.totalVotes} vote${p.totalVotes!==1?'s':''}${p.myVote?' · ✓ Voted':''}</span>
      <div style="display:flex;gap:0.4rem">
        <button class="btn btn--ghost btn--sm" onclick="copyLink('${shareUrl}')">🔗 Share poll</button>
        ${p.authorId===currentUser?.id?`<button class="btn btn--danger btn--sm" onclick="deletePoll('${p.id}')">Delete</button>`:''}
      </div>
    </div>
  </div>`;
}

function optHTML(o, p, maxV, canVote) {
  const isWin=o.votes===maxV&&p.totalVotes>0, isMine=p.myVote===o.id;
  return `<div class="poll-option${isMine?' voted':''}${isWin&&p.totalVotes>0?' winner':''}" ${canVote?`onclick="castVote('${p.id}','${o.id}')" `:''}style="${canVote?'':'cursor:default'}">
    <div class="poll-bar" style="width:${o.percent}%"></div>
    <span class="poll-option-text">${isMine?'✓ ':''}${esc(o.text)}</span>
    <span class="poll-option-pct">${o.percent}%</span>
  </div>`;
}

async function castVote(pollId, optionId) {
  if(!currentUser){navigate('login');return;}
  try {
    const upd=await api.post(`/api/workspaces/${currentWs.slug}/polls/${pollId}/vote`,{optionId});
    const maxV=Math.max(...upd.options.map(o=>o.votes),1);
    byId(`popts-${pollId}`).innerHTML=upd.options.map(o=>optHTML(o,upd,maxV,false)).join('');
    byId(`poll-${pollId}`).querySelector('.poll-footer span').textContent=`${upd.totalVotes} vote${upd.totalVotes!==1?'s':''} · ✓ Voted`;
    toast('Vote cast! ✦','success');
  } catch(e){toast(e.message,'error');}
}

function openCreatePoll() {
  if(!currentUser){navigate('login');return;}
  openModal(`
    <p class="form__title">Create Poll ✦</p>
    <div class="form-group"><label>Question</label><input class="form-input" id="pq" placeholder="What do you want to ask?"/></div>
    <div class="form-group">
      <label>Options <span>(2–8, press Enter to add)</span></label>
      <div id="opts-builder">
        <div class="opt-row"><input class="form-input" type="text" class="poll-opt" placeholder="Option 1" onkeydown="if(event.key==='Enter'){event.preventDefault();addOpt()}"/></div>
        <div class="opt-row"><input class="form-input" type="text" class="poll-opt" placeholder="Option 2"/></div>
      </div>
      <button class="btn btn--ghost btn--sm" style="margin-top:0.5rem" onclick="addOpt()">+ Add option</button>
    </div>
    <p class="form__error" id="perr"></p>
    <button class="btn btn--primary" style="width:100%;margin-top:0.25rem" onclick="doPoll()">Create poll →</button>`);
}

function addOpt() {
  const b=byId('opts-builder'), c=b.querySelectorAll('input').length;
  if(c>=8){toast('Max 8 options','error');return;}
  const d=document.createElement('div'); d.className='opt-row';
  d.innerHTML=`<input class="form-input poll-opt" type="text" placeholder="Option ${c+1}"/><button class="rm-opt" onclick="this.parentElement.remove()">✕</button>`;
  b.appendChild(d); d.querySelector('input').focus();
}

async function doPoll() {
  const question=val('pq');
  const options=[...document.querySelectorAll('.poll-opt')].map(i=>i.value.trim()).filter(Boolean);
  const err=byId('perr'); err.textContent='';
  if(!question){err.textContent='Question required';return;}
  if(options.length<2){err.textContent='Need at least 2 options';return;}
  try {
    await api.post(`/api/workspaces/${currentWs.slug}/polls`,{question,options});
    closeModal(); toast('Poll created! ✦','success');
    loadPolls(currentWs.slug);
  } catch(e){err.textContent=e.message;}
}

function deletePoll() { toast('Coming soon','info'); }

/* ── Standalone poll page ── */
async function renderStandalonePoll(pollId) {
  setApp(`<div style="display:flex;justify-content:center;align-items:center;height:60vh"><div class="spinner-ring"></div></div>`);
  try {
    const poll=await api.get(`/api/polls/${pollId}`);
    const maxV=Math.max(...poll.options.map(o=>o.votes),1);
    const canVote=currentUser&&!poll.myVote;
    setApp(`
      <div class="page page--sm stagger" style="padding-top:3rem">
        <span class="back-link" onclick="navigate('home')">← Home</span>
        <div class="card" style="margin-bottom:1.5rem">
          <div style="font-size:0.78rem;color:var(--text-3);margin-bottom:0.75rem">Poll by ${esc(poll.authorName)}</div>
          <p class="poll-question" style="font-size:1.25rem">${esc(poll.question)}</p>
          ${!currentUser?`<p style="color:var(--pink-300);font-size:0.88rem;margin-bottom:0.75rem">⚠ Sign in to vote</p>`:''}
          <div id="sp-opts">${poll.options.map(o=>saOptHTML(o,poll,maxV,canVote,pollId)).join('')}</div>
          <p class="poll-footer" style="margin-top:0.75rem;display:block">${poll.totalVotes} vote${poll.totalVotes!==1?'s':''}${poll.myVote?' · ✓ You voted':''}</p>
        </div>
        <div style="text-align:center">
          <button class="btn btn--ghost" onclick="navigate('home')">Explore workspaces →</button>
        </div>
      </div>`);
  } catch(e){
    setApp(`<div class="page page--sm" style="padding-top:5rem;text-align:center"><p style="color:var(--error)">${esc(e.message)}</p><button class="btn btn--ghost" style="margin-top:1.5rem" onclick="navigate('home')">← Home</button></div>`);
  }
}

function saOptHTML(o,p,maxV,canVote,pollId) {
  const isWin=o.votes===maxV&&p.totalVotes>0, isMine=p.myVote===o.id;
  return `<div class="poll-option${isMine?' voted':''}${isWin&&p.totalVotes>0?' winner':''}" ${canVote?`onclick="saVote('${pollId}','${o.id}')"`:''}style="${canVote?'':'cursor:default'}">
    <div class="poll-bar" style="width:${o.percent}%"></div>
    <span class="poll-option-text">${isMine?'✓ ':''}${esc(o.text)}</span>
    <span class="poll-option-pct">${o.percent}%</span>
  </div>`;
}

async function saVote(pollId, optionId) {
  try {
    const upd=await api.post(`/api/polls/${pollId}/vote`,{optionId});
    const maxV=Math.max(...upd.options.map(o=>o.votes),1);
    byId('sp-opts').innerHTML=upd.options.map(o=>saOptHTML(o,upd,maxV,false,pollId)).join('');
    toast('Vote cast! ✦','success');
  } catch(e){toast(e.message,'error');}
}
