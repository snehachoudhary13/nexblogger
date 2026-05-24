const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/profile — current user's full profile with stats
router.get('/', requireAuth, (req, res) => {
  const user = db.collection('users').findOne(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const memberships  = db.collection('members').find(m => m.userId === user.id);
  const workspaceIds = memberships.map(m => m.workspaceId);
  const workspaces   = db.collection('workspaces').find(w => workspaceIds.includes(w.id));
  const posts        = db.collection('posts').find(p => p.authorId === user.id);
  const comments     = db.collection('comments').find(c => c.authorId === user.id);
  const polls        = db.collection('polls').find(p => p.authorId === user.id);
  const votes        = db.collection('votes').find(v => v.userId === user.id);

  // Enrich workspaces
  const enrichedWs = workspaces.map(w => {
    const owner = db.collection('users').findOne(u => u.id === w.ownerId);
    return {
      ...w,
      ownerName: owner?.name || 'Unknown',
      isOwned: w.ownerId === user.id,
      postCount: db.collection('posts').find(p => p.workspaceId === w.id).length,
      memberCount: db.collection('members').find(m => m.workspaceId === w.id).length,
    };
  }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Recent posts with workspace info
  const enrichedPosts = posts.map(p => {
    const ws = db.collection('workspaces').findOne(w => w.id === p.workspaceId);
    return { ...p, workspaceName: ws?.name || '', workspaceSlug: ws?.slug || '',
      commentCount: db.collection('comments').find(c => c.postId === p.id).length };
  }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

  res.json({
    id: user.id, name: user.name, email: user.email,
    avatar: user.avatar, bio: user.bio || '',
    createdAt: user.createdAt,
    stats: {
      workspaces: workspaces.length,
      posts: posts.length,
      comments: comments.length,
      polls: polls.length,
      votes: votes.length,
    },
    workspaces: enrichedWs,
    recentPosts: enrichedPosts,
  });
});

// PATCH /api/profile — update name, bio, password
router.patch('/', requireAuth, async (req, res) => {
  const { name, bio, currentPassword, newPassword } = req.body;
  const user = db.collection('users').findOne(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const changes = {};

  if (name?.trim()) {
    changes.name   = name.trim();
    changes.avatar = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }
  if (bio !== undefined) changes.bio = bio.trim();

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: 'Current password required to change password' });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be 6+ characters' });
    changes.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const updated = db.collection('users').update(u => u.id === user.id, changes);
  res.json({ id: updated.id, name: updated.name, email: updated.email, avatar: updated.avatar, bio: updated.bio || '' });
});

// GET /api/profile/:userId — public profile of any user
router.get('/:userId', (req, res) => {
  const user = db.collection('users').findOne(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const posts = db.collection('posts').find(p => p.authorId === user.id);
  const publicWorkspaceIds = db.collection('members').find(m => m.userId === user.id).map(m => m.workspaceId);
  const publicWorkspaces = db.collection('workspaces').find(w => publicWorkspaceIds.includes(w.id) && w.type === 'public');

  res.json({
    id: user.id, name: user.name, avatar: user.avatar, bio: user.bio || '',
    createdAt: user.createdAt,
    stats: { posts: posts.length, workspaces: publicWorkspaces.length },
  });
});

module.exports = router;
