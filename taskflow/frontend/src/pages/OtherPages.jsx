import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, tasksApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, formatDate, isOverdue, statusLabel, priorityLabel, timeAgo, getErrorMessage } from '../utils.jsx';
import { TaskModal } from '../components/TaskModal.jsx';
import defaultApi from '../api';

export function MyTasksPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    projectsApi.list().then(async r => {
      const projs = r.data.projects;
      setProjects(projs);
      const taskArrays = await Promise.all(
        projs.map(p =>
          projectsApi.get(p.id).then(r => ({
            tasks: r.data.tasks.map(t => ({ ...t, project_name: p.name, project_id: p.id })),
            members: r.data.members,
            projectId: p.id,
          }))
        )
      );
      const membersMap = {};
      const myTasks = [];
      taskArrays.forEach(({ tasks, members, projectId }) => {
        membersMap[projectId] = members;
        tasks.forEach(t => { if (t.assignee_id === user.id) myTasks.push(t); });
      });
      setProjectMembers(membersMap);
      setAllTasks(myTasks);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.id]);

  const handleUpdateTask = async (taskId, data) => {
    const res = await tasksApi.update(selectedProjectId, taskId, data);
    setAllTasks(t => t.map(task =>
      task.id === taskId ? { ...res.data.task, project_name: task.project_name, project_id: task.project_id } : task
    ));
    setSelectedTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    await tasksApi.delete(selectedProjectId, taskId);
    setAllTasks(t => t.filter(task => task.id !== taskId));
    setSelectedTask(null);
  };

  const filtered = allTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || t.status === filter;
    return matchSearch && matchFilter;
  });

  const overdue = filtered.filter(t => isOverdue(t.due_date) && t.status !== 'done');

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1>My Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{allTasks.length} tasks assigned to you</p>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="alert alert-error">⚠️ {overdue.length} overdue task{overdue.length > 1 ? 's' : ''} need your attention</div>
      )}

      <div className="filter-bar">
        <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search tasks..." />
        {['all', 'todo', 'in_progress', 'review', 'done'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : statusLabel(f)}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-desc">You're all caught up!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(task => (
            <div
              key={task.id}
              className={`task-card ${task.priority}`}
              onClick={() => { setSelectedTask(task); setSelectedProjectId(task.project_id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ flex: 1 }}>
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span>
                  <span className={`badge badge-${task.priority}`}>{priorityLabel(task.priority)}</span>
                  <Link
                    to={`/projects/${task.project_id}`}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: '0.78rem', color: 'var(--accent-light)', textDecoration: 'none' }}
                  >
                    📁 {task.project_name}
                  </Link>
                  {task.due_date && (
                    <span className={`task-due ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}>
                      {isOverdue(task.due_date) && task.status !== 'done' ? '⚠️ Overdue · ' : '📅 '}{formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={selectedProjectId}
          members={projectMembers[selectedProjectId] || []}
          onClose={() => setSelectedTask(null)}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.list().then(r => { setUsers(r.data.users); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>All Users</h1>
        <div style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', padding: '6px 14px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600 }}>
          {users.length} total
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={u.name} avatar={u.avatar} size="sm" />
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{timeAgo(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminOverviewPage() {
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    projectsApi.list().then(async r => {
      const projs = r.data.projects;
      setProjects(projs);
      const taskArrays = await Promise.all(
        projs.map(p => tasksApi.list(p.id).then(r => r.data.tasks.map(t => ({ ...t, project_name: p.name, project_id: p.id }))))
      );
      setAllTasks(taskArrays.flat());
      setLoading(false);
    });
  }, []);

  const handleUpdateTask = async (taskId, data) => {
    const res = await tasksApi.update(selectedProjectId, taskId, data);
    setAllTasks(t => t.map(task =>
      task.id === taskId ? { ...res.data.task, project_name: task.project_name, project_id: task.project_id } : task
    ));
    setSelectedTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    await tasksApi.delete(selectedProjectId, taskId);
    setAllTasks(t => t.filter(task => task.id !== taskId));
    setSelectedTask(null);
  };

  const filtered = allTasks.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const today = new Date().toISOString().split('T')[0];
  const overdue = allTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1>All Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{allTasks.length} tasks across {projects.length} projects</p>
        </div>
        {overdue > 0 && <div className="badge badge-urgent">⚠️ {overdue} overdue</div>}
      </div>

      <div className="filter-bar">
        {['all', 'todo', 'in_progress', 'review', 'done'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Status' : statusLabel(f)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
            <button key={p} className={`btn btn-sm ${priorityFilter === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPriorityFilter(p)}>
              {p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Title</th><th>Project</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th></tr>
          </thead>
          <tbody>
            {filtered.map(task => (
              <tr key={task.id} onClick={() => { setSelectedTask(task); setSelectedProjectId(task.project_id); }} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 500 }}>{task.title}</td>
                <td>
                  <Link
                    to={`/projects/${task.project_id}`}
                    onClick={e => e.stopPropagation()}
                    style={{ color: 'var(--accent-light)', textDecoration: 'none', fontSize: '0.85rem' }}
                  >
                    {task.project_name}
                  </Link>
                </td>
                <td><span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span></td>
                <td><span className={`badge badge-${task.priority}`}>{priorityLabel(task.priority)}</span></td>
                <td>
                  {task.assignee_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={task.assignee_name} avatar={task.assignee_avatar} size="sm" />
                      <span style={{ fontSize: '0.85rem' }}>{task.assignee_name}</span>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td>
                  {task.due_date ? (
                    <span
                      className={isOverdue(task.due_date) && task.status !== 'done' ? 'overdue-highlight' : ''}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {isOverdue(task.due_date) && task.status !== 'done' ? '⚠️ ' : ''}{formatDate(task.due_date)}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={selectedProjectId}
          members={[]}
          onClose={() => setSelectedTask(null)}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await defaultApi.put('/auth/profile', form);
      updateUser(res.data.user);
      setSuccess('Profile updated successfully');
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header"><h1>Profile</h1></div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <Avatar name={user?.name} avatar={user?.avatar} size="lg" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user?.email}</div>
            <span className={`badge badge-${user?.role}`} style={{ marginTop: 6 }}>{user?.role}</span>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <hr className="divider" />
          <h4 style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Change Password</h4>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Required to change password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="At least 6 characters"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
