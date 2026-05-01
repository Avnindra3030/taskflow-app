const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-change-in-production';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireProjectAccess(req, res, next) {
  const db = getDb();
  const projectId = req.params.projectId || req.body.project_id;
  if (!projectId) return next();

  const member = db.prepare(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!member && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied to this project' });
  }

  req.project = project;
  req.projectMember = member;
  next();
}

function requireProjectAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (!req.projectMember || req.projectMember.role !== 'admin') {
    return res.status(403).json({ error: 'Project admin access required' });
  }
  next();
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authenticate, requireAdmin, requireProjectAccess, requireProjectAdmin, generateToken };
