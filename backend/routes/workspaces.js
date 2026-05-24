const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
function makeSlug(name) {
  const base = slug(name);
  return db.collection('workspaces').find(w=>w.slug.startsWith(base)).length
    ? `${base}-${Date.now().toString(36)}` : base;
}
function isMember(wsId, userId) {
  return !!db.collection('members').findOne(m=>m.workspaceId===wsId&&m.userId===userId);
}
function canAccess(ws, userId) {
  return ws.type==='public' || (userId&&(ws.ownerId===userId||isMember(ws.id,userId)));
}
function enrich(ws, userId) {
  const mc = db.collection('members').find(m=>m.workspaceId===ws.id).length;
  const pc = db.collection('posts').find(p=>p.workspaceId===ws.id).length;
  const plc= db.collection('polls').find(p=>p.workspaceId===ws.id).length;
  const fc = db.collection('files').find(f=>f.workspaceId===ws.id).length;
  const owner = db.collection('users').findOne(u=>u.id===ws.ownerId);
  return { ...ws, memberCount:mc, postCount:pc, pollCount:plc, fileCount:fc,
    ownerName:owner?.name||'Unknown', ownerAvatar:owner?.avatar||'?',
    isMember: userId ? isMember(ws.id,userId) : false };
}

router.get('/', optionalAuth, (req,res) => {
  const all = db.collection('workspaces').find();
  const visible = all.filter(w => canAccess(w, req.user?.id))
    .map(w=>enrich(w,req.user?.id))
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  res.json(visible);
});

router.get('/mine', requireAuth, (req,res) => {
  const memberships = db.collection('members').find(m=>m.userId===req.user.id).map(m=>m.workspaceId);
  const mine = db.collection('workspaces').find(w=>memberships.includes(w.id)||w.ownerId===req.user.id);
  res.json(mine.map(w=>enrich(w,req.user.id)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));
});

router.post('/', requireAuth, (req,res) => {
  const { name, description, type } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (!['public','private'].includes(type)) return res.status(400).json({ error: 'type must be public or private' });
  const ws = db.collection('workspaces').insert({
    id:uuid(), slug:makeSlug(name), name:name.trim(),
    description:description?.trim()||'', type, ownerId:req.user.id,
    createdAt:new Date().toISOString(),
  });
  db.collection('members').insert({ workspaceId:ws.id, userId:req.user.id, joinedAt:new Date().toISOString() });
  res.status(201).json(enrich(ws,req.user.id));
});

router.get('/:slug', optionalAuth, (req,res) => {
  const ws = db.collection('workspaces').findOne(w=>w.slug===req.params.slug);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });
  if (!canAccess(ws,req.user?.id)) return res.status(403).json({ error: 'Private workspace — ask the owner for an invite link' });
  res.json(enrich(ws,req.user?.id));
});

router.post('/:slug/join', requireAuth, (req,res) => {
  const ws = db.collection('workspaces').findOne(w=>w.slug===req.params.slug);
  if (!ws) return res.status(404).json({ error: 'Not found' });
  if (!isMember(ws.id,req.user.id))
    db.collection('members').insert({ workspaceId:ws.id, userId:req.user.id, joinedAt:new Date().toISOString() });
  res.json({ message:'Joined!', workspace:enrich(ws,req.user.id) });
});

router.get('/:slug/members', optionalAuth, (req,res) => {
  const ws = db.collection('workspaces').findOne(w=>w.slug===req.params.slug);
  if (!ws||!canAccess(ws,req.user?.id)) return res.status(403).json({ error:'Access denied' });
  const members = db.collection('members').find(m=>m.workspaceId===ws.id);
  const users = db.collection('users').find();
  res.json(members.map(m=>{
    const u=users.find(u=>u.id===m.userId);
    return { id:m.userId, name:u?.name||'Unknown', avatar:u?.avatar||'?', joinedAt:m.joinedAt, isOwner:ws.ownerId===m.userId };
  }));
});

module.exports = router;
