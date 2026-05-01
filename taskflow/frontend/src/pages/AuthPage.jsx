import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils.jsx';

export default function AuthPage({ mode }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await signup(form);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card slide-up">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Task<span style={{ color: 'var(--accent-light)' }}>Flow</span></div>
        </div>

        <h1 className="auth-title">{isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to your workspace' : 'Start managing your team\'s tasks'}
        </p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
              required
              minLength={isLogin ? 1 : 6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <p className="form-hint">Admins can create projects and manage members</p>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }} disabled={loading}>
            {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? '→ Sign In' : '→ Create Account')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <>Don't have an account? <Link to="/signup">Sign up</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
