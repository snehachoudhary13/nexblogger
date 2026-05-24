async function loadPosts(slug) {
  setBody(`<div style="display:flex;justify-content:center;padding:2rem"><div class="spinner-ring"></div></div>`);
  try {
    const posts=await api.get(`/api/workspaces/${slug}/posts`);
    if(!posts.length){setBody(`<div class="empty"><div class="empty__icon">📝</div><div class="empty__title">No posts yet</div><div class="empty__sub">${currentWs?.isMember?'Be the first to share something!':''}</div></div>`);return;}
    setBody(`<div class="grid stagger">${posts.map(postCard).join('')}</div>`);
  } catch(e){setBody(`<p style="color:var(--error)">${esc(e.message)}</p>`);}
}

function postCard(p) {
  return `<div class="card card--clickable" onclick="openPost('${p.id}')">
    <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.75rem">
      <div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${esc(p.authorAvatar||'?')}</div>
      <span style="font-size:0.8rem;color:var(--text-3)">${esc(p.authorName)} · ${timeAgo(p.createdAt)}</span>
    </div>
    <h3 style="font-weight:700;font-size:1rem;line-height:1.35;margin-bottom:0.4rem">${esc(p.title)}</h3>
    <p class="post-preview">${esc(p.body)}</p>
    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.9rem">
      <span class="tag tag--stat">💬 ${p.commentCount}</span>
    </div>
  </div>`;
}

function openCreatePost() {
  if(!currentUser){navigate('login');return;}
  openModal(`
    <p class="form__title">New Post ✦</p>
    <div class="form-group"><label>Title</label><input class="form-input" id="pt" placeholder="What's on your mind?"/></div>
    <div class="form-group"><label>Content</label><textarea class="form-input" id="pb" placeholder="Share your experience, ideas, or question..." rows="6"></textarea></div>
    <p class="form__error" id="perr"></p>
    <button class="btn btn--primary" style="width:100%" onclick="doPost()">Publish →</button>`);
}

async function doPost() {
  const title=val('pt'),body=val('pb'),err=byId('perr'); err.textContent='';
  if(!title||!body){err.textContent='Both title and content required';return;}
  try {
    await api.post(`/api/workspaces/${currentWs.slug}/posts`,{title,body});
    closeModal(); toast('Post published! ✦','success');
    loadPosts(currentWs.slug);
  } catch(e){err.textContent=e.message;}
}

async function openPost(postId) {
  setBody(`<div style="display:flex;justify-content:center;padding:2rem"><div class="spinner-ring"></div></div>`);
  try {
    const post=await api.get(`/api/workspaces/${currentWs.slug}/posts/${postId}`);
    setBody(`
      <div style="max-width:720px" class="stagger">
        <span class="back-link" onclick="loadPosts('${currentWs.slug}')">← Back to posts</span>
        <div class="card" style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:1rem">
            <div class="avatar">${esc(post.authorAvatar||'?')}</div>
            <div>
              <div style="font-weight:600;font-size:0.9rem">${esc(post.authorName)}</div>
              <div style="font-size:0.78rem;color:var(--text-3)">${timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem;line-height:1.3">${esc(post.title)}</h2>
          <div class="post-full-body">${esc(post.body)}</div>
          ${post.authorId===currentUser?.id?`
            <div class="divider"></div>
            <button class="btn btn--danger btn--sm" onclick="deletePost('${post.id}')">Delete post</button>`:''}
        </div>
        <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-2);margin-bottom:1rem">Comments (${post.comments.length})</h3>
        <div class="stagger">
          ${post.comments.length
            ? post.comments.map(c=>`<div class="comment">
                <div class="avatar" style="width:28px;height:28px;font-size:0.68rem;flex-shrink:0">${esc(c.authorAvatar||'?')}</div>
                <div class="comment__body-wrap">
                  <div class="comment__author">${esc(c.authorName)} · ${timeAgo(c.createdAt)}</div>
                  <div class="comment__body">${esc(c.body)}</div>
                </div>
              </div>`).join('')
            : `<p style="color:var(--text-3);font-size:0.88rem;margin-bottom:1rem">No comments yet. Start the conversation!</p>`}
        </div>
        ${currentWs?.isMember&&currentUser?`
          <div class="card" style="margin-top:1rem">
            <div class="form-group" style="margin-bottom:0.75rem">
              <textarea class="form-input" id="cmtbody" placeholder="Add a comment…" rows="3"></textarea>
            </div>
            <button class="btn btn--primary btn--sm" onclick="doComment('${post.id}')">Comment →</button>
          </div>`:''}
      </div>`);
  } catch(e){setBody(`<p style="color:var(--error)">${esc(e.message)}</p>`);}
}

async function doComment(postId) {
  const body=val('cmtbody'); if(!body)return;
  try {
    await api.post(`/api/workspaces/${currentWs.slug}/posts/${postId}/comments`,{body});
    toast('Comment added! ✦','success'); openPost(postId);
  } catch(e){toast(e.message,'error');}
}

async function deletePost(postId) {
  if(!confirm('Delete this post and all its comments?'))return;
  try {
    await api.delete(`/api/workspaces/${currentWs.slug}/posts/${postId}`);
    toast('Post deleted'); loadPosts(currentWs.slug);
  } catch(e){toast(e.message,'error');}
}
