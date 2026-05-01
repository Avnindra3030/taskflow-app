import React, { useState, useEffect } from 'react';
import { tasksApi, usersApi } from '../api';
import { Avatar, formatDate, timeAgo, isOverdue, statusLabel, priorityLabel, getErrorMessage } from '../utils.jsx';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export function TaskModal({ task, projectId, members, onClose, onSave, onDelete, mode = 'view' }) {
  const { user, isAdmin } = useAuth();
  const [editing, setEditing] = useState(mode === 'create');
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task && mode === 'view') {
      tasksApi.getComments(projectId, task.id).then(r => setComments(r.data.comments)).catch(() => {});
    }
  }, [task, projectId, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      if (mode === 'create') {
        await onSave(payload);
      } else {
        await onSave(task.id, payload);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await tasksApi.addComment(projectId, task.id, { content: newComment });
      setComments(c => [...c, res.data.comment]);
      setNewComment('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await onDelete(task.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const canEdit = isAdmin || task?.creator_id === user?.id || members?.find(m => m.id === user?.id && m.role === 'admin');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${mode !== 'create' ? 'modal-lg' : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'create' ? '+ New Task' : (editing ? '✏️ Edit Task' : task?.title)}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {mode !== 'create' && canEdit && !editing && (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
            {mode !== 'create' && canEdit && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            )}
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {(editing || mode === 'create') ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Add details..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="form-select" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => mode === 'create' ? onClose() : setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (mode === 'create' ? 'Create Task' : 'Save Changes')}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* Task details view */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span>
                <span className={`badge badge-${task.priority}`}>{priorityLabel(task.priority)}</span>
                {task.due_date && (
                  <span className={`badge ${isOverdue(task.due_date) && task.status !== 'done' ? 'badge-urgent' : 'badge-todo'}`}>
                    📅 {formatDate(task.due_date)} {isOverdue(task.due_date) && task.status !== 'done' ? '⚠️ Overdue' : ''}
                  </span>
                )}
              </div>

              {task.description && (
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {task.description}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignee</div>
                  {task.assignee_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={task.assignee_name} avatar={task.assignee_avatar} size="sm" />
                      <span style={{ fontSize: '0.88rem' }}>{task.assignee_name}</span>
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Unassigned</span>}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created By</div>
                  <span style={{ fontSize: '0.88rem' }}>{task.creator_name}</span>
                </div>
              </div>

              {/* Comments */}
              <div>
                <h4 style={{ marginBottom: 14, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Comments ({comments.length})
                </h4>
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>No comments yet.</p>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    {comments.map(c => (
                      <div key={c.id} className="comment">
                        <Avatar name={c.user_name} avatar={c.user_avatar} size="sm" />
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{c.user_name}</span>
                            <span className="comment-time">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="comment-text">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleComment} style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newComment.trim()}>Post</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
