const router = require('express').Router({ mergeParams: true });
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const getWs  = slug => db.collection('workspaces').findOne(w=>w.slug===slug);
const member = (wsId,uid) => !!db.collection('members').findOne(m=>m.workspaceId===wsId&&m.userId===uid);
const canRead= (ws,uid) => ws.type==='public'||(uid&&(ws.ownerId===uid||member(ws.id,uid)));

function enrich(poll, uid) {
  const votes = db.collection('votes').find(v=>v.pollId===poll.id);
  const total = votes.length;
  const myVote = uid ? votes.find(v=>v.userId===uid)?.optionId : null;
  const author = db.collection('users').findOne(u=>u.id===poll.authorId);
  return { ...poll, totalVotes:total, myVote,
    authorName:author?.name||'Unknown', authorAvatar:author?.avatar||'?',
    options: poll.options.map(o=>({
      ...o, votes:votes.filter(v=>v.optionId===o.id).length,
      percent: total ? Math.round(votes.filter(v=>v.optionId===o.id).length/total*100) : 0,
    })),
  };
}

router.get('/', optionalAuth, (req,res) => {
  const ws = getWs(req.params.slug);
  if (!ws||!canRead(ws,req.user?.id)) return res.status(403).json({ error:'Access denied' });
  const polls = db.collection('polls').find(p=>p.workspaceId===ws.id)
    .map(p=>enrich(p,req.user?.id))
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  res.json(polls);
});

router.post('/', requireAuth, (req,res) => {
  const ws = getWs(req.params.slug);
  if (!ws) return res.status(404).json({ error:'Not found' });
  if (!member(ws.id,req.user.id)) return res.status(403).json({ error:'Join to create polls' });
  const { question, options } = req.body;
  if (!question?.trim()) return res.status(400).json({ error:'Question required' });
  if (!Array.isArray(options)||options.length<2) return res.status(400).json({ error:'Need at least 2 options' });
  const poll = db.collection('polls').insert({
    id:uuid(), workspaceId:ws.id, authorId:req.user.id,
    question:question.trim(),
    options:options.filter(o=>o?.trim()).map(o=>({ id:uuid(), text:o.trim() })),
    createdAt:new Date().toISOString(),
  });
  res.status(201).json(enrich(poll,req.user.id));
});

router.post('/:pollId/vote', requireAuth, (req,res) => {
  const poll = db.collection('polls').findOne(p=>p.id===req.params.pollId);
  if (!poll) return res.status(404).json({ error:'Poll not found' });
  const ws = db.collection('workspaces').findOne(w=>w.id===poll.workspaceId);
  if (!canRead(ws,req.user.id)) return res.status(403).json({ error:'Access denied' });
  const { optionId } = req.body;
  if (!poll.options.find(o=>o.id===optionId)) return res.status(400).json({ error:'Invalid option' });
  db.collection('votes').delete(v=>v.pollId===poll.id&&v.userId===req.user.id);
  db.collection('votes').insert({ pollId:poll.id, optionId, userId:req.user.id });
  res.json(enrich(poll,req.user.id));
});

// Standalone poll
const standalone = require('express').Router();
standalone.get('/:id', optionalAuth, (req,res) => {
  const poll = db.collection('polls').findOne(p=>p.id===req.params.id);
  if (!poll) return res.status(404).json({ error:'Poll not found' });
  const ws = db.collection('workspaces').findOne(w=>w.id===poll.workspaceId);
  if (!canRead(ws,req.user?.id)) return res.status(403).json({ error:'Private workspace' });
  res.json(enrich(poll,req.user?.id));
});
standalone.post('/:id/vote', requireAuth, (req,res) => {
  const poll = db.collection('polls').findOne(p=>p.id===req.params.id);
  if (!poll) return res.status(404).json({ error:'Not found' });
  const ws = db.collection('workspaces').findOne(w=>w.id===poll.workspaceId);
  if (!canRead(ws,req.user.id)) return res.status(403).json({ error:'Access denied' });
  const { optionId } = req.body;
  if (!poll.options.find(o=>o.id===optionId)) return res.status(400).json({ error:'Invalid option' });
  db.collection('votes').delete(v=>v.pollId===poll.id&&v.userId===req.user.id);
  db.collection('votes').insert({ pollId:poll.id, optionId, userId:req.user.id });
  res.json(enrich(poll,req.user.id));
});

module.exports = { workspacePollRouter:router, standalonePollRouter:standalone };
