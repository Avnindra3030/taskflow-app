const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, 
      u.name as assignee_name, u.avatar as assignee_avatar,
      c.name as creator_name, c.avatar as creator_avatar
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.project_id = ?
    ORDER BY 
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.created_at DESC
  `).all(req.params.projectId);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectAccess, [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional().isInt(),
  body('due_date').optional().isDate(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, priority = 'medium', assignee_id, due_date } = req.body;
  const db = getDb();

  // Validate assignee is project member
  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember && req.user.role !== 'admin') return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, assignee_id, due_date, project_id, creator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, priority, assignee_id || null, due_date || null, req.params.projectId, req.user.id);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectAccess, [
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const updates = [];
  const values = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
  if (assignee_id !== undefined) { updates.push('assignee_id = ?'); values.push(assignee_id || null); }
  if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date || null); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.taskId);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users c ON t.creator_id = c.id
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Only creator, project admin, or system admin can delete
  const isProjectAdmin = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, req.user.id);
  if (task.creator_id !== req.user.id && req.user.role !== 'admin' && (!isProjectAdmin || isProjectAdmin.role !== 'admin')) {
    return res.status(403).json({ error: 'Only the task creator or project admin can delete tasks' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

// GET /api/projects/:projectId/tasks/:taskId/comments
router.get('/:taskId/comments', authenticate, requireProjectAccess, (req, res) => {
  const db = getDb();
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.taskId);
  res.json({ comments });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectAccess, [
  body('content').trim().notEmpty().withMessage('Comment content is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const result = db.prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)').run(req.params.taskId, req.user.id, req.body.content);
  const comment = db.prepare('SELECT c.*, u.name as user_name, u.avatar as user_avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(result.lastInsertRowid);
  res.status(201).json({ comment });
});

module.exports = router;
