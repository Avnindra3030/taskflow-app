import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetail from './pages/ProjectDetail';
import { MyTasksPage, AdminUsersPage, AdminOverviewPage, ProfilePage } from './pages/OtherPages';
import './index.css';

function ProtectedLayout({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><AuthPage mode="login" /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><AuthPage mode="signup" /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
          <Route path="/projects/:projectId" element={<ProtectedLayout><ProjectDetail /></ProtectedLayout>} />
          <Route path="/my-tasks" element={<ProtectedLayout><MyTasksPage /></ProtectedLayout>} />
          <Route path="/admin/users" element={<ProtectedLayout adminOnly><AdminUsersPage /></ProtectedLayout>} />
          <Route path="/admin/overview" element={<ProtectedLayout adminOnly><AdminOverviewPage /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
