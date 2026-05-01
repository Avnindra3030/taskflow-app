const express = require('express');
const { getDb } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - aggregated stats
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  let stats;
  if (req.user.role === 'admin') {
    stats = {
      totalProjects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
      activeProjects: db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'active'").get().c,
      totalTasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
      myTasks: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ?').get(req.user.id).c,
      overdueTasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE due_date < ? AND status != 'done'").get(today).c,
      completedTasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get().c,
      totalMembers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    };

    stats.recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name, u.avatar as assignee_avatar
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      ORDER BY t.updated_at DESC LIMIT 10
    `).all();

    stats.tasksByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks GROUP BY status
    `).all();

    stats.tasksByPriority = db.prepare(`
      SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority
    `).all();

    stats.projects = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p ORDER BY p.created_at DESC LIMIT 5
    `).all();
  } else {
    const memberProjectIds = db.prepare('SELECT project_id FROM project_members WHERE user_id = ?').all(req.user.id).map(r => r.project_id);
    const projectIdList = memberProjectIds.length > 0 ? memberProjectIds.join(',') : '0';

    stats = {
      totalProjects: memberProjectIds.length,
      activeProjects: memberProjectIds.length > 0
        ? db.prepare(`SELECT COUNT(*) as c FROM projects WHERE id IN (${projectIdList}) AND status = 'active'`).get().c
        : 0,
      myTasks: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ?').get(req.user.id).c,
      overdueTasks: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ? AND due_date < ? AND status != 'done'`).get(req.user.id, today).c,
      completedTasks: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ? AND status = 'done'`).get(req.user.id).c,
    };

    stats.recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name, u.avatar as assignee_avatar
      FROM tasks t JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id IN (${projectIdList})
      ORDER BY t.updated_at DESC LIMIT 10
    `).all();

    stats.tasksByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = ? GROUP BY status
    `).all(req.user.id);

    stats.projects = memberProjectIds.length > 0
      ? db.prepare(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p WHERE p.id IN (${projectIdList})
        ORDER BY p.created_at DESC LIMIT 5
      `).all()
      : [];
  }

  res.json(stats);
});

// GET /api/users - list all users (admin only or for member search)
router.get('/users', authenticate, (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY name').all();
  res.json({ users });
});

module.exports = router;
