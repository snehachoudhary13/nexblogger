// ─── Files tab ────────────────────────────────────────────────
async function loadFiles(slug) {
  setBody(`
    ${currentWs?.isMember&&currentUser ? dropZoneHTML() : ''}
    <div id="files-list"><div style="display:flex;justify-content:center;padding:2rem"><div class="spinner-ring"></div></div></div>`);

  if (currentWs?.isMember && currentUser) initDropZone();
  await fetchFiles(slug);
}

async function fetchFiles(slug) {
  try {
    const files = await api.get(`/api/workspaces/${slug}/files`);
    const el = byId('files-list');
    if (!files.length) {
      el.innerHTML = `<div class="empty"><div class="empty__icon">📎</div><div class="empty__title">No files yet</div><div class="empty__sub">${currentWs?.isMember ? 'Upload images, videos, PDFs, code & more!' : ''}</div></div>`;
      return;
    }
    el.innerHTML = `<div class="files-grid stagger">${files.map(fileCard).join('')}</div>`;
  } catch(e) {
    byId('files-list').innerHTML = `<p style="color:var(--error)">${esc(e.message)}</p>`;
  }
}

function dropZoneHTML() {
  return `
    <div class="drop-zone" id="drop-zone" onclick="byId('file-input').click()">
      <div class="drop-zone__icon">☁</div>
      <div class="drop-zone__text">Drop files here or click to upload</div>
      <div class="drop-zone__sub">Images · Videos · PDFs · Code · XML · up to 50MB each</div>
    </div>
    <input type="file" id="file-input" style="display:none" multiple
      accept="image/*,video/*,application/pdf,text/*,application/json,application/xml,.py,.js,.ts,.java,.c,.cpp,.go,.rs,.php,.rb,.sh,.xml,.yaml,.yml,.toml,.sql,.jsx,.tsx"
      onchange="handleFileSelect(this.files)"/>
    <div id="upload-progress" style="display:none" class="upload-progress">
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-3);margin-bottom:0.4rem">
        <span id="upload-label">Uploading…</span>
        <span id="upload-pct">0%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
    </div>`;
}

function initDropZone() {
  const zone = byId('drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files);
  });
}

async function handleFileSelect(fileList) {
  if (!fileList?.length) return;
  const files = Array.from(fileList);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    showProgress(file.name, 0);

    try {
      const fd = new FormData();
      fd.append('file', file);

      // Simulate progress via XHR for real progress bar
      await uploadWithProgress(`/api/workspaces/${currentWs.slug}/files`, fd, pct => {
        showProgress(file.name, pct);
      });

      toast(`✦ ${file.name} uploaded!`, 'success');
    } catch(e) {
      toast(`Failed: ${e.message}`, 'error');
    }
  }

  hideProgress();
  await fetchFiles(currentWs.slug);
}

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    const token = localStorage.getItem('nexblogger_token');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    });
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

function showProgress(name, pct) {
  const wrap = byId('upload-progress');
  if (!wrap) return;
  wrap.style.display = 'block';
  byId('upload-label').textContent = `Uploading ${name}…`;
  byId('upload-pct').textContent = `${pct}%`;
  byId('progress-fill').style.width = `${pct}%`;
}

function hideProgress() {
  const wrap = byId('upload-progress');
  if (wrap) { wrap.style.display = 'none'; byId('progress-fill').style.width = '0%'; }
}

// ─── File card rendering ──────────────────────────────────────
function fileCard(f) {
  const fileUrl = `/uploads/${f.storedName}`;
  const shareUrl = `${location.origin}${fileUrl}`;
  const size = formatSize(f.size);

  return `<div class="card file-card">
    ${filePreview(f, fileUrl)}
    <div>
      <div class="file-name">${esc(f.originalName)}</div>
      <div class="file-meta">${esc(f.uploaderName)} · ${timeAgo(f.uploadedAt)} · ${size}</div>
      ${f.caption ? `<div class="file-caption">${esc(f.caption)}</div>` : ''}
    </div>
    <div class="file-actions">
      <a href="${fileUrl}" download="${esc(f.originalName)}" class="btn btn--ghost btn--sm">⬇ Download</a>
      <button class="btn btn--ghost btn--sm" onclick="copyLink('${shareUrl}')">🔗 Copy link</button>
      ${f.uploaderId === currentUser?.id || currentWs?.ownerId === currentUser?.id
        ? `<button class="btn btn--danger btn--sm" onclick="deleteFile('${f.id}')">Delete</button>` : ''}
    </div>
  </div>`;
}

function filePreview(f, url) {
  if (f.kind === 'image') {
    return `<div class="file-preview">
      <img src="${url}" alt="${esc(f.originalName)}" loading="lazy" onclick="openLightbox('${url}')"/>
    </div>`;
  }
  if (f.kind === 'video') {
    return `<div class="file-preview">
      <video controls preload="metadata">
        <source src="${url}" type="${esc(f.mimetype)}"/>
        Your browser does not support video.
      </video>
    </div>`;
  }
  if (f.kind === 'pdf') {
    return `<div class="file-preview pdf-prev">
      <div style="text-align:center">
        <div class="file-icon-big">📄</div>
        <a href="${url}" target="_blank" class="btn btn--ghost btn--sm" style="margin-top:0.5rem">Open PDF</a>
      </div>
    </div>`;
  }
  if (f.kind === 'code' || f.kind === 'xml') {
    return `<div class="file-preview code-prev" id="code-${f.id}">
      <div class="code-block">Loading preview…</div>
    </div>`;
  }
  return `<div style="padding:1rem;text-align:center;background:var(--grey-800);border-radius:var(--r-sm)">
    <div class="file-icon-big">${fileIcon(f.kind)}</div>
  </div>`;
}

// Load code previews asynchronously so the page renders first
function loadCodePreview(fileId, url) {
  const el = byId(`code-${fileId}`);
  if (!el) return;
  fetch(url).then(r => r.text()).then(text => {
    el.querySelector('.code-block').textContent = text.slice(0, 800);
  }).catch(() => {});
}

function fileIcon(kind) {
  const icons = { pdf:'📄', code:'💻', xml:'📋', video:'🎬', image:'🖼', file:'📎' };
  return icons[kind] || '📎';
}

async function deleteFile(fileId) {
  if (!confirm('Delete this file?')) return;
  try {
    await api.delete(`/api/workspaces/${currentWs.slug}/files/${fileId}`);
    toast('File deleted', 'info');
    fetchFiles(currentWs.slug);
  } catch(e) { toast(e.message, 'error'); }
}

// Lightbox functions are in core.js
