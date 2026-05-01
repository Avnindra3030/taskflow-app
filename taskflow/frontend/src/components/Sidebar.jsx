import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../utils.jsx';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div className="logo-text">Task<span>Flow</span></div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">Main</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📁</span> Projects
          </NavLink>
          <NavLink to="/my-tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">✅</span> My Tasks
          </NavLink>
        </div>

        {isAdmin && (
          <div className="nav-section">
            <div className="nav-section-label">Admin</div>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">👥</span> Users
            </NavLink>
            <NavLink to="/admin/overview" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🔭</span> All Tasks
            </NavLink>
          </div>
        )}

        <div className="nav-section">
          <div className="nav-section-label">Account</div>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">👤</span> Profile
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-user">
        <Avatar name={user?.name} avatar={user?.avatar} size="sm" />
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
        </div>
        <button className="btn-logout" onClick={logout} title="Logout">⏻</button>
      </div>
    </aside>
  );
}
