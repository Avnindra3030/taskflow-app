import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, tasksApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, formatDate, isOverdue, statusLabel, priorityLabel, progressPercent, getErrorMessage } from '../utils.jsx';
import { TaskModal } from '../components/TaskModal.jsx';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-muted)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onAdd({ email, role });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">👥 Add Member</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="team@company.com" required />
              <p className="form-hint">User must already have a TaskFlow account</p>
            </div>
            <div className="form-group">
              <label className="form-label">Project Role</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [error, setError] = useState('');

  const myRole = members.find(m => m.id === user?.id)?.role;
  const canManage = isAdmin || myRole === 'admin';

  useEffect(() => {
    projectsApi.get(projectId).then(r => {
      setProject(r.data.project);
      setMembers(r.data.members);
      setTasks(r.data.tasks);
      setLoading(false);
    }).catch(() => { navigate('/projects'); });
  }, [projectId]);

  const handleCreateTask = async (data) => {
    const res = await tasksApi.create(projectId, data);
    setTasks(t => [res.data.task, ...t]);
    setShowCreate(false);
  };

  const handleUpdateTask = async (taskId, data) => {
    const res = await tasksApi.update(projectId, taskId, data);
    setTasks(t => t.map(task => task.id === taskId ? res.data.task : task));
    setSelectedTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    await tasksApi.delete(projectId, taskId);
    setTasks(t => t.filter(task => task.id !== taskId));
    setSelectedTask(null);
  };

  const handleAddMember = async (data) => {
    const res = await projectsApi.addMember(projectId, data);
    setMembers(m => [...m, res.data.user]);
    setShowAddMember(false);
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsApi.removeMember(projectId, userId);
      setMembers(m => m.filter(member => member.id !== userId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await projectsApi.delete(projectId);
    navigate('/projects');
  };

  const handleStatusChange = async (newStatus) => {
    const res = await projectsApi.update(projectId, { status: newStatus });
    setProject(res.data.project);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const pct = progressPercent(tasks.length, tasks.filter(t => t.status === 'done').length);

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>← Projects</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: '1.6rem' }}>{project.name}</h1>
              <span className={`badge badge-${project.status}`}>{project.status}</span>
            </div>
            {project.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>{project.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(true)}>+ Task</button>
            {canManage && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(true)}>👥 Add Member</button>
                <select className="form-select" style={{ width: 'auto', fontSize: '0.82rem', padding: '5px 10px' }} value={project.status} onChange={e => handleStatusChange(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
              </>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div className="progress-bar" style={{ width: 120, margin: 0 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }}></div>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{pct}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Tasks</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{tasks.filter(t => t.status === 'done').length}/{tasks.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Members</div>
            <div style={{ display: 'flex', marginTop: 4, gap: -4 }}>
              {members.slice(0, 5).map(m => <Avatar key={m.id} name={m.name} avatar={m.avatar} size="sm" style={{ marginLeft: -4, border: '2px solid var(--bg-card)' }} />)}
              {members.length > 5 && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', border: '2px solid var(--bg-card)' }}>+{members.length - 5}</div>}
            </div>
          </div>
          {project.due_date && (
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Due Date</div>
              <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.88rem' }}>{formatDate(project.due_date)}</div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        {[['board', '🗂️ Board'], ['list', '📋 List'], ['members', '👥 Members']].map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Kanban Board */}
      {tab === 'board' && (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-header">
                  <span className="kanban-title" style={{ color: col.color }}>{col.label}</span>
                  <span className="kanban-count">{colTasks.length}</span>
                </div>
                <div className="kanban-tasks">
                  {colTasks.map(task => (
                    <div key={task.id} className={`task-card ${task.priority}`} onClick={() => setSelectedTask(task)}>
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        <span className={`badge badge-${task.priority}`}>{priorityLabel(task.priority)}</span>
                        {task.due_date && (
                          <span className={`task-due ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}>
                            📅 {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.assignee_id && (
                          <div style={{ marginLeft: 'auto' }}>
                            <Avatar name={task.assignee_name} avatar={task.assignee_avatar} size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task List */}
      {tab === 'list' && (
        <div className="table-wrapper">
          {tasks.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">No tasks yet</div><div className="empty-desc">Create your first task to get started</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{task.title}</td>
                    <td><span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span></td>
                    <td><span className={`badge badge-${task.priority}`}>{priorityLabel(task.priority)}</span></td>
                    <td>
                      {task.assignee_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={task.assignee_name} avatar={task.assignee_avatar} size="sm" />
                          <span>{task.assignee_name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {task.due_date ? (
                        <span className={isOverdue(task.due_date) && task.status !== 'done' ? 'overdue-highlight' : ''}>
                          {isOverdue(task.due_date) && task.status !== 'done' ? '⚠️ ' : ''}{formatDate(task.due_date)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Members */}
      {tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }}>
          {members.map(m => (
            <div key={m.id} className="member-item">
              <Avatar name={m.name} avatar={m.avatar} size="md" />
              <div className="member-info">
                <div className="member-name">{m.name} {m.id === user?.id ? <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(you)</span> : ''}</div>
                <div className="member-email">{m.email}</div>
              </div>
              <span className={`badge badge-${m.role}`}>{m.role}</span>
              {canManage && m.id !== user?.id && m.id !== project.owner_id && (
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemoveMember(m.id)} title="Remove member">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <TaskModal mode="create" projectId={projectId} members={members} onClose={() => setShowCreate(false)} onSave={handleCreateTask} />
      )}
      {selectedTask && (
        <TaskModal task={selectedTask} projectId={projectId} members={members} onClose={() => setSelectedTask(null)} onSave={handleUpdateTask} onDelete={handleDeleteTask} />
      )}
      {showAddMember && (
        <AddMemberModal projectId={projectId} onClose={() => setShowAddMember(false)} onAdd={handleAddMember} />
      )}
    </div>
  );
}
