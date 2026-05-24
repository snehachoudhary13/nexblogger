const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'nexus-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Login required' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Session expired — please log in again' }); }
}

function optionalAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token) { try { req.user = jwt.verify(token, SECRET); } catch {} }
  next();
}

function signToken(u) {
  return jwt.sign({ id: u.id, name: u.name, email: u.email }, SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, optionalAuth, signToken };
