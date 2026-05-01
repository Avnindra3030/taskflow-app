import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar, formatDate, isOverdue, statusLabel, priorityLabel, progressPercent } from '../utils.jsx';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const statCards = isAdmin ? [
    { label: 'Total Projects', value: data?.totalProjects || 0, color: 'accent', icon: '📁' },
    { label: 'Active Projects', value: data?.activeProjects || 0, color: 'green', icon: '🚀' },
    { label: 'Total Tasks', value: data?.totalTasks || 0, color: 'blue', icon: '✅' },
    { label: 'My Assigned', value: data?.myTasks || 0, color: 'accent', icon: '👤' },
    { label: 'Overdue', value: data?.overdueTasks || 0, color: 'red', icon: '⚠️' },
    { label: 'Completed', value: data?.completedTasks || 0, color: 'green', icon: '🎉' },
  ] : [
    { label: 'My Projects', value: data?.totalProjects || 0, color: 'accent', icon: '📁' },
    { label: 'My Tasks', value: data?.myTasks || 0, color: 'blue', icon: '✅' },
    { label: 'Overdue', value: data?.overdueTasks || 0, color: 'red', icon: '⚠️' },
    { label: 'Completed', value: data?.completedTasks || 0, color: 'green', icon: '🎉' },
  ];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>
            Good to see you, {user?.name?.split(' ')[0]} 👋
          </p>
        </div>
        {isAdmin && (
          <Link to="/projects/new" className="btn btn-primary">+ New Project</Link>
        )}
      </div>

      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Tasks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Recent Activity</h3>
            <Link to="/my-tasks" style={{ fontSize: '0.8rem', color: 'var(--accent-light)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {!data?.recentTasks?.length ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-icon">📋</div>
              <div className="empty-desc">No tasks yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recentTasks.slice(0, 6).map(task => (
                <div key={task.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge badge-${task.status}`} style={{ flexShrink: 0 }}>{statusLabel(task.status)}</span>
                  <span style={{ flex: 1, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  {task.due_date && (
                    <span style={{ fontSize: '0.72rem', color: isOverdue(task.due_date) && task.status !== 'done' ? 'var(--red)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {isOverdue(task.due_date) && task.status !== 'done' ? '⚠️ ' : ''}{formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Projects</h3>
            <Link to="/projects" style={{ fontSize: '0.8rem', color: 'var(--accent-light)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {!data?.projects?.length ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-icon">📁</div>
              <div className="empty-desc">{isAdmin ? 'Create your first project' : 'Not in any projects yet'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.projects.map(p => {
                const pct = progressPercent(p.task_count, p.done_count);
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        <span>✅ {p.done_count}/{p.task_count} tasks</span>
                        <span>👥 {p.member_count} members</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
