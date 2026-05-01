import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Projects
export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
};

// Tasks
export const tasksApi = {
  list: (projectId) => api.get(`/projects/${projectId}/tasks`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId, taskId, data) => api.put(`/projects/${projectId}/tasks/${taskId}`, data),
  delete: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
  getComments: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}/comments`),
  addComment: (projectId, taskId, data) => api.post(`/projects/${projectId}/tasks/${taskId}/comments`, data),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Users
export const usersApi = {
  list: () => api.get('/users'),
};

export default api;
