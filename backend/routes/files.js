const router  = require('express').Router({ mergeParams: true });
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuid } = require('uuid');
const db      = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Allowed MIME types
const ALLOWED = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'image/webp': 'image',
  'video/mp4': 'video', 'video/webm': 'video', 'video/ogg': 'video',
  'application/pdf': 'pdf',
  'text/plain': 'code', 'text/javascript': 'code', 'application/json': 'code',
  'text/x-python': 'code', 'text/html': 'code', 'text/css': 'code',
  'application/xml': 'xml', 'text/xml': 'xml',
  'application/octet-stream': 'file',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    // Allow by mime or extension for code files
    const ext = path.extname(file.originalname).toLowerCase();
    const codeExts = ['.js','.ts','.py','.java','.c','.cpp','.go','.rs','.php','.rb','.sh','.xml','.json','.yaml','.yml','.toml','.md','.txt','.sql','.css','.html','.jsx','.tsx'];
    if (ALLOWED[file.mimetype] || codeExts.includes(ext)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

function getWorkspace(slug) { return db.collection('workspaces').findOne(w=>w.slug===slug); }
function isMember(wsId, uid) { return !!db.collection('members').findOne(m=>m.workspaceId===wsId&&m.userId===uid); }
function canAccess(ws, uid) { return ws.type==='public'||(uid&&(ws.ownerId===uid||isMember(ws.id,uid))); }

function detectKind(mimetype, filename) {
  if (ALLOWED[mimetype]) return ALLOWED[mimetype];
  const ext = path.extname(filename).toLowerCase();
  if (['.xml','.svg'].includes(ext)) return 'xml';
  if (['.py','.js','.ts','.java','.c','.cpp','.go','.rs','.php','.rb','.sh','.sql','.css','.html','.jsx','.tsx','.json','.yaml','.yml','.md','.txt'].includes(ext)) return 'code';
  return 'file';
}

// GET /api/workspaces/:slug/files
router.get('/', optionalAuth, (req,res) => {
  const ws = getWorkspace(req.params.slug);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });
  if (!canAccess(ws,req.user?.id)) return res.status(403).json({ error: 'Access denied' });
  const files = db.collection('files').find(f=>f.workspaceId===ws.id)
    .sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt));
  const users = db.collection('users').find();
  res.json(files.map(f=>({ ...f, uploaderName: users.find(u=>u.id===f.uploaderId)?.name||'Unknown' })));
});

// POST /api/workspaces/:slug/files
router.post('/', requireAuth, upload.single('file'), (req,res) => {
  const ws = getWorkspace(req.params.slug);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });
  if (!isMember(ws.id,req.user.id)) return res.status(403).json({ error: 'Join workspace to upload files' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const kind = detectKind(req.file.mimetype, req.file.originalname);
  const file = db.collection('files').insert({
    id: uuid(),
    workspaceId: ws.id,
    uploaderId: req.user.id,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    kind,
    caption: req.body.caption?.trim() || '',
    uploadedAt: new Date().toISOString(),
  });

  const uploader = db.collection('users').findOne(u=>u.id===req.user.id);
  res.status(201).json({ ...file, uploaderName: uploader?.name });
});

// DELETE /api/workspaces/:slug/files/:fileId
router.delete('/:fileId', requireAuth, (req,res) => {
  const ws  = getWorkspace(req.params.slug);
  const file = db.collection('files').findOne(f=>f.id===req.params.fileId&&f.workspaceId===ws?.id);
  if (!file) return res.status(404).json({ error: 'Not found' });
  if (file.uploaderId!==req.user.id && ws?.ownerId!==req.user.id)
    return res.status(403).json({ error: 'Not your file' });
  // Remove from disk
  try { fs.unlinkSync(path.join(UPLOAD_DIR, file.storedName)); } catch {}
  db.collection('files').delete(f=>f.id===file.id);
  res.json({ message: 'Deleted' });
});

// Serve uploaded files (raw)
const serveRouter = require('express').Router();
serveRouter.get('/:filename', optionalAuth, (req,res) => {
  const file = db.collection('files').findOne(f=>f.storedName===req.params.filename);
  if (!file) return res.status(404).json({ error: 'File not found' });
  const ws = db.collection('workspaces').findOne(w=>w.id===file.workspaceId);
  if (!canAccess(ws, req.user?.id)) return res.status(403).json({ error: 'Access denied' });
  const filePath = path.join(UPLOAD_DIR, file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing from disk' });
  res.setHeader('Content-Type', file.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
  res.sendFile(filePath);
});

module.exports = { workspaceFileRouter: router, serveRouter };
