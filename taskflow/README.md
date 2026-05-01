# ⚡ TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, built with Node.js/Express backend and React frontend.

## 🚀 Live Demo

> Deploy to Railway following the steps below to get your live URL.

---

## ✨ Features

### Authentication
- Signup / Login with JWT tokens
- Role-based access: **Admin** and **Member**
- Profile management & password change

### Projects
- Admins create and manage projects
- Invite team members by email
- Project-level roles (Admin / Member)
- Track project status: Active, Completed, Archived
- Due date tracking with progress bar

### Tasks
- Create, edit, delete tasks within projects
- **Kanban board** (To Do → In Progress → Review → Done)
- **List view** with sortable table
- Priority levels: Low, Medium, High, Urgent
- Assign tasks to project members
- Due date tracking with overdue indicators ⚠️
- Comments on tasks

### Dashboard
- Personalized stats (my tasks, overdue, completed)
- Recent activity feed
- Project progress overview

### Admin Panel
- View all users and their roles
- Global task overview across all projects
- Filter by status and priority

---

## 🛠️ Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Backend   | Node.js, Express.js               |
| Database  | SQLite (via sql.js — pure JS)     |
| Auth      | JWT (jsonwebtoken) + bcryptjs     |
| Validation| express-validator                  |
| Frontend  | React 18, React Router v6         |
| Build     | Vite                               |
| Styling   | Custom CSS with design system     |
| Deploy    | Railway                           |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── db.js              # SQLite setup with sql.js
│   ├── server.js          # Express app entry point
│   ├── middleware/
│   │   └── auth.js        # JWT auth & RBAC middleware
│   └── routes/
│       ├── auth.js        # /api/auth/* endpoints
│       ├── projects.js    # /api/projects/* endpoints
│       ├── tasks.js       # /api/projects/:id/tasks/* 
│       └── dashboard.js   # /api/dashboard
├── frontend/
│   ├── src/
│   │   ├── api.js         # Axios API client
│   │   ├── App.jsx        # Router & layouts
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── TaskModal.jsx
│   │   └── pages/
│   │       ├── AuthPage.jsx
│   │       ├── Dashboard.jsx
│   │       ├── ProjectsPage.jsx
│   │       ├── ProjectDetail.jsx
│   │       └── OtherPages.jsx
│   └── vite.config.js
├── railway.toml           # Railway deployment config
└── README.md
```

---

## 🌐 Deployment on Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - TaskFlow"
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your `taskflow` repository
4. Railway auto-detects `railway.toml` and builds the project

### Step 3: Set Environment Variables
In Railway dashboard → Variables, add:
```
NODE_ENV=production
JWT_SECRET=your-random-secret-key-here
PORT=5000
```

### Step 4: Get Your URL
Railway provides a public URL like `https://taskflow-production.up.railway.app`

---

## 💻 Local Development

### Prerequisites
- Node.js 18+

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Edit as needed
node server.js
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
# API proxied to :5000 via vite.config.js
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint           | Description          | Auth  |
|--------|--------------------|----------------------|-------|
| POST   | /api/auth/signup   | Register new user    | No    |
| POST   | /api/auth/login    | Login                | No    |
| GET    | /api/auth/me       | Get current user     | Yes   |
| PUT    | /api/auth/profile  | Update profile       | Yes   |

### Projects
| Method | Endpoint                           | Description           | Auth     |
|--------|------------------------------------|-----------------------|----------|
| GET    | /api/projects                      | List my projects      | Yes      |
| POST   | /api/projects                      | Create project        | Admin    |
| GET    | /api/projects/:id                  | Get project details   | Member   |
| PUT    | /api/projects/:id                  | Update project        | Proj.Admin|
| DELETE | /api/projects/:id                  | Delete project        | Proj.Admin|
| POST   | /api/projects/:id/members          | Add member            | Proj.Admin|
| DELETE | /api/projects/:id/members/:userId  | Remove member         | Proj.Admin|

### Tasks
| Method | Endpoint                                    | Description     | Auth    |
|--------|---------------------------------------------|-----------------|---------|
| GET    | /api/projects/:id/tasks                     | List tasks      | Member  |
| POST   | /api/projects/:id/tasks                     | Create task     | Member  |
| PUT    | /api/projects/:id/tasks/:taskId             | Update task     | Member  |
| DELETE | /api/projects/:id/tasks/:taskId             | Delete task     | Creator |
| GET    | /api/projects/:id/tasks/:taskId/comments    | Get comments    | Member  |
| POST   | /api/projects/:id/tasks/:taskId/comments    | Add comment     | Member  |

### Dashboard & Users
| Method | Endpoint        | Description       | Auth    |
|--------|-----------------|-------------------|---------|
| GET    | /api/dashboard  | Get stats         | Yes     |
| GET    | /api/users      | List all users    | Yes     |
| GET    | /api/health     | Health check      | No      |

---

## 🔐 Role-Based Access Control

### System Roles
| Permission              | Admin | Member |
|-------------------------|-------|--------|
| Create projects         | ✅    | ❌     |
| View all projects       | ✅    | ❌     |
| View assigned projects  | ✅    | ✅     |
| View all users          | ✅    | ✅     |
| View all tasks (admin)  | ✅    | ❌     |

### Project Roles
| Permission              | Project Admin | Project Member |
|-------------------------|---------------|----------------|
| Manage project settings | ✅            | ❌             |
| Add/remove members      | ✅            | ❌             |
| Create tasks            | ✅            | ✅             |
| Update any task         | ✅            | ✅             |
| Delete own tasks        | ✅            | ✅             |
| Delete any task         | ✅            | ❌             |

---

## 👤 Default Test Accounts

After deploying, sign up with:
- **Admin**: Choose role "Admin" during signup
- **Member**: Choose role "Member" during signup

---

## 📦 Database Schema

```sql
users          -- id, name, email, password, role, avatar, created_at
projects       -- id, name, description, status, owner_id, due_date, created_at
project_members-- id, project_id, user_id, role, joined_at
tasks          -- id, title, description, status, priority, project_id, 
               --    assignee_id, creator_id, due_date, created_at, updated_at
comments       -- id, task_id, user_id, content, created_at
```

---

## 🎨 Design System

- **Dark theme** with CSS custom properties
- **DM Sans** (body) + **Space Mono** (numbers/code)
- Accent: Indigo/Purple gradient
- Status colors: Green (done), Blue (in progress), Yellow (review), Red (urgent/overdue)

---

Built with ❤️ for the TaskFlow assignment
