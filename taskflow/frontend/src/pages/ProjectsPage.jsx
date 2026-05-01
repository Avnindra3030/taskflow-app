import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { progressPercent, formatDate, getErrorMessage } from '../utils.jsx';

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', due_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(form);
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
          <h3 className="modal-title">📁 New Project</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    projectsApi.list().then(r => { setProjects(r.data.projects); setLoading(false); });
  }, []);

  const handleCreate = async (data) => {
    const res = await projectsApi.create(data);
    setProjects(p => [res.data.project, ...p]);
    setShowCreate(false);
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>Projects</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
        )}
      </div>

      <div className="filter-bar">
        <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search projects..." />
        {['all', 'active', 'completed', 'archived'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-title">{search ? 'No projects match your search' : 'No projects yet'}</div>
          <div className="empty-desc">{isAdmin && !search ? 'Create your first project to get started' : ''}</div>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(p => {
            const pct = progressPercent(p.task_count, p.done_count);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                <div className="project-card-header">
                  <div>
                    <div className="project-name">{p.name}</div>
                  </div>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
                {p.description && <p className="project-desc">{p.description}</p>}
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12, marginTop: 4 }}>
                  {pct}% complete
                </div>
                <div className="project-stats">
                  <span className="project-stat">✅ {p.done_count}/{p.task_count} tasks</span>
                  <span className="project-stat">👥 {p.member_count}</span>
                  {p.due_date && <span className="project-stat">📅 {formatDate(p.due_date)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
