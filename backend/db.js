const fs   = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

const EMPTY = {
  users: [], workspaces: [], members: [],
  posts: [], comments: [], polls: [], votes: [], files: []
};

function load() {
  if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2)); return JSON.parse(JSON.stringify(EMPTY)); }
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return JSON.parse(JSON.stringify(EMPTY)); }
}
function save(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }

module.exports = {
  collection(name) {
    return {
      find:    (p) => { const d = load(); return (d[name]||[]).filter(p||(()=>true)); },
      findOne: (p) => { const d = load(); return (d[name]||[]).find(p); },
      insert:  (doc) => { const d = load(); if(!d[name]) d[name]=[]; d[name].push(doc); save(d); return doc; },
      update:  (p, ch) => { const d = load(); let u=null; d[name]=d[name].map(r=>{if(p(r)){u={...r,...ch};return u;}return r;}); save(d); return u; },
      delete:  (p) => { const d = load(); const b=d[name].length; d[name]=d[name].filter(r=>!p(r)); save(d); return b-d[name].length; },
    };
  }
};
