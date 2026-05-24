const router = require('express').Router({ mergeParams: true });
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const getWs  = slug => db.collection('workspaces').findOne(w=>w.slug===slug);
const member = (wsId,uid) => !!db.collection('members').findOne(m=>m.workspaceId===wsId&&m.userId===uid);
const canRead= (ws,uid) => ws.type==='public'||(uid&&(ws.ownerId===uid||member(ws.id,uid)));

router.get('/', optionalAuth, (req,res) => {
  const ws = getWs(req.params.slug);
  if (!ws||!canRead(ws,req.user?.id)) return res.status(403).json({ error:'Access denied' });
  const users = db.collection('users').find();
  const posts = db.collection('posts').find(p=>p.workspaceId===ws.id)
    .map(p=>({ ...p,
      authorName: users.find(u=>u.id===p.authorId)?.name||'Unknown',
      authorAvatar: users.find(u=>u.id===p.authorId)?.avatar||'?',
      commentCount: db.collection('comments').find(c=>c.postId===p.id).length,
    })).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  res.json(posts);
});

router.post('/', requireAuth, (req,res) => {
  const ws = getWs(req.params.slug);
  if (!ws) return res.status(404).json({ error:'Not found' });
  if (!member(ws.id,req.user.id)) return res.status(403).json({ error:'Join workspace to post' });
  const { title, body } = req.body;
  if (!title||!body) return res.status(400).json({ error:'Title and body required' });
  const post = db.collection('posts').insert({
    id:uuid(), workspaceId:ws.id, authorId:req.user.id,
    title:title.trim(), body:body.trim(), createdAt:new Date().toISOString(),
  });
  const user = db.collection('users').findOne(u=>u.id===req.user.id);
  res.status(201).json({ ...post, authorName:user?.name, authorAvatar:user?.avatar, commentCount:0 });
});

router.get('/:postId', optionalAuth, (req,res) => {
  const ws = getWs(req.params.slug);
  if (!ws||!canRead(ws,req.user?.id)) return res.status(403).json({ error:'Access denied' });
  const post = db.collection('posts').findOne(p=>p.id===req.params.postId&&p.workspaceId===ws.id);
  if (!post) return res.status(404).json({ error:'Post not found' });
  const users = db.collection('users').find();
  const author = users.find(u=>u.id===post.authorId);
  const comments = db.collection('comments').find(c=>c.postId===post.id)
    .map(c=>({ ...c, authorName:users.find(u=>u.id===c.authorId)?.name||'Unknown',
      authorAvatar:users.find(u=>u.id===c.authorId)?.avatar||'?' }))
    .sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  res.json({ ...post, authorName:author?.name||'Unknown', authorAvatar:author?.avatar||'?', comments });
});

router.post('/:postId/comments', requireAuth, (req,res) => {
  const ws = getWs(req.params.slug);
  if (!ws||!member(ws.id,req.user.id)) return res.status(403).json({ error:'Join to comment' });
  const post = db.collection('posts').findOne(p=>p.id===req.params.postId);
  if (!post) return res.status(404).json({ error:'Post not found' });
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error:'Comment cannot be empty' });
  const comment = db.collection('comments').insert({
    id:uuid(), postId:post.id, authorId:req.user.id,
    body:body.trim(), createdAt:new Date().toISOString(),
  });
  const user = db.collection('users').findOne(u=>u.id===req.user.id);
  res.status(201).json({ ...comment, authorName:user?.name, authorAvatar:user?.avatar });
});

router.delete('/:postId', requireAuth, (req,res) => {
  const ws  = getWs(req.params.slug);
  const post = db.collection('posts').findOne(p=>p.id===req.params.postId&&p.workspaceId===ws?.id);
  if (!post) return res.status(404).json({ error:'Not found' });
  if (post.authorId!==req.user.id&&ws.ownerId!==req.user.id) return res.status(403).json({ error:'Not your post' });
  db.collection('posts').delete(p=>p.id===post.id);
  db.collection('comments').delete(c=>c.postId===post.id);
  res.json({ message:'Deleted' });
});

module.exports = router;
