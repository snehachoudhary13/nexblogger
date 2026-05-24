// ─── Shared utilities — loaded first so every other script can use these ───

const byId = id => document.getElementById(id);
const val  = id => (byId(id)?.value || '').trim();
const esc  = s  => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ini  = n  => (n || '').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => toast('Link copied! ✦', 'success'));
}

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function skeletonGrid() {
  return `<div class="grid">${Array(4).fill(0).map(() => `
    <div class="skel-card">
      <div class="skel-line w-60 skeleton" style="height:16px;margin-bottom:0.85rem"></div>
      <div class="skel-line w-80 skeleton" style="height:12px;margin-bottom:0.5rem"></div>
      <div class="skel-line w-40 skeleton" style="height:12px"></div>
    </div>`).join('')}</div>`;
}
