const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters' });
  if (db.collection('users').findOne(u => u.email === email.toLowerCase()))
    return res.status(409).json({ error: 'Email already registered' });
  const user = db.collection('users').insert({
    id: uuid(), name: name.trim(), email: email.toLowerCase().trim(),
    passwordHash: await bcrypt.hash(password, 10),
    avatar: name.trim().split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.collection('users').findOne(u => u.email === email.toLowerCase());
  if (!user || !await bcrypt.compare(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.collection('users').findOne(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, createdAt: user.createdAt });
});

module.exports = router;
