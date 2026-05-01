const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - list projects user is member of
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  let projects;

  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, u.avatar as owner_avatar,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, u.avatar as owner_avatar,
        pm.role as my_role,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }

  res.json({ projects });
});

// POST /api/projects - create project (admin only)
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('due_date').optional().isDate(),
], (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create projects' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, due_date } = req.body;
  const db = getDb();

  const result = db.prepare(
    'INSERT INTO projects (name, description, due_date, owner_id) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, due_date || null, req.user.id);

  // Add creator as project admin
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, u.avatar as owner_avatar
    FROM projects p JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.projectId);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.projectId);

  const tasks = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.projectId);

  res.json({ project, members, tasks });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, [
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'completed', 'archived']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { name, description, status, due_date } = req.body;
  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.projectId);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  res.json({ project });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectAccess, requireProjectAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted successfully' });
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', authenticate, requireProjectAccess, requireProjectAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role = 'member' } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a project member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user.id, role);
  res.status(201).json({ message: 'Member added', user: { ...user, role } });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectAccess, requireProjectAdmin, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id == req.params.userId) return res.status(400).json({ error: 'Cannot remove project owner' });

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
