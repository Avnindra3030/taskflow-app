===================================================================
  TASKFLOW - TEAM TASK MANAGER
  Full-Stack Web Application
===================================================================

LIVE URL: https://taskflow-production.up.railway.app
(Deploy using steps below to get your live URL)

GITHUB REPO: https://github.com/YOUR_USERNAME/taskflow

-------------------------------------------------------------------
OVERVIEW
-------------------------------------------------------------------
TaskFlow is a full-stack team task management application with:
- JWT Authentication (Signup/Login)
- Role-Based Access Control (Admin / Member)
- Project & Team Management
- Task Creation, Assignment & Status Tracking
- Kanban Board + List View
- Real-time Dashboard with stats
- Comments on tasks
- Overdue task detection

-------------------------------------------------------------------
TECH STACK
-------------------------------------------------------------------
Backend:
  - Node.js + Express.js (REST API)
  - SQLite via sql.js (pure JavaScript, no native compilation)
  - JWT authentication (jsonwebtoken)
  - Password hashing (bcryptjs)
  - Input validation (express-validator)

Frontend:
  - React 18 + React Router v6
  - Vite (build tool)
  - Custom CSS design system (dark theme)
  - Axios (HTTP client)

Deployment:
  - Railway (railway.app)
  - Monorepo with build pipeline via railway.toml

-------------------------------------------------------------------
PROJECT STRUCTURE
-------------------------------------------------------------------
taskflow/
├── backend/
│   ├── server.js           Express entry point
│   ├── db.js               SQLite database with sql.js
│   ├── middleware/
│   │   └── auth.js         JWT auth + RBAC middleware
│   └── routes/
│       ├── auth.js         POST /api/auth/signup, login, GET /me
│       ├── projects.js     CRUD + member management
│       ├── tasks.js        CRUD + comments
│       └── dashboard.js    Stats aggregation
├── frontend/
│   ├── src/
│   │   ├── App.jsx         Router + protected routes
│   │   ├── api.js          Axios API client layer
│   │   ├── context/        AuthContext (user state)
│   │   ├── components/     Sidebar, TaskModal
│   │   └── pages/          Auth, Dashboard, Projects, Tasks
│   └── vite.config.js      Dev proxy + build config
├── railway.toml            Railway deployment config
└── README.md               Full documentation

-------------------------------------------------------------------
DATABASE SCHEMA
-------------------------------------------------------------------
users          (id, name, email, password, role, avatar, created_at)
projects       (id, name, description, status, owner_id, due_date)
project_members(id, project_id, user_id, role, joined_at)
tasks          (id, title, description, status, priority, project_id,
                assignee_id, creator_id, due_date, created_at, updated_at)
comments       (id, task_id, user_id, content, created_at)

-------------------------------------------------------------------
API ENDPOINTS
-------------------------------------------------------------------
Auth:
  POST /api/auth/signup   Register (name, email, password, role)
  POST /api/auth/login    Login (email, password)
  GET  /api/auth/me       Current user (requires token)
  PUT  /api/auth/profile  Update profile/password

Projects:
  GET    /api/projects           List my projects
  POST   /api/projects           Create project [Admin only]
  GET    /api/projects/:id       Get project + members + tasks
  PUT    /api/projects/:id       Update project [Project Admin]
  DELETE /api/projects/:id       Delete project [Project Admin]
  POST   /api/projects/:id/members      Add member
  DELETE /api/projects/:id/members/:uid Remove member

Tasks:
  GET    /api/projects/:id/tasks              List tasks
  POST   /api/projects/:id/tasks              Create task
  PUT    /api/projects/:id/tasks/:taskId      Update task
  DELETE /api/projects/:id/tasks/:taskId      Delete task
  GET    /api/projects/:id/tasks/:tid/comments Get comments
  POST   /api/projects/:id/tasks/:tid/comments Add comment

Dashboard:
  GET /api/dashboard   Aggregated stats for current user
  GET /api/users       List all users
  GET /api/health      Health check

-------------------------------------------------------------------
ROLE-BASED ACCESS CONTROL
-------------------------------------------------------------------
System Roles:
  Admin:  Can create projects, view all projects/users/tasks
  Member: Can only access projects they're invited to

Project Roles (per project):
  Admin:  Can manage project settings, add/remove members,
          create/update/delete any task
  Member: Can create/update tasks, add comments

-------------------------------------------------------------------
DEPLOYMENT STEPS (Railway)
-------------------------------------------------------------------
1. Push code to GitHub:
   git init && git add . && git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USER/taskflow.git
   git push -u origin main

2. Create Railway project:
   - Go to railway.app -> New Project -> GitHub repo
   - Select your taskflow repository
   - Railway reads railway.toml automatically

3. Set environment variables in Railway dashboard:
   NODE_ENV=production
   JWT_SECRET=your-random-32-char-secret-here
   PORT=5000

4. Deploy and get your URL from Railway dashboard

-------------------------------------------------------------------
LOCAL SETUP
-------------------------------------------------------------------
Backend:
  cd backend && npm install && node server.js
  # Runs on port 5000

Frontend:
  cd frontend && npm install && npm run dev
  # Runs on port 5173 (proxies /api to :5000)

-------------------------------------------------------------------
FEATURES CHECKLIST
-------------------------------------------------------------------
[x] User Signup / Login / Logout
[x] JWT Authentication with 7-day expiry
[x] Admin role: create projects, see all data
[x] Member role: access only assigned projects
[x] Project creation with name, description, due date
[x] Project status management (active/completed/archived)
[x] Add members to projects by email
[x] Project-level roles (admin/member)
[x] Task creation with title, description, priority, due date
[x] Task assignment to project members
[x] Task status tracking (todo/in_progress/review/done)
[x] Kanban board view
[x] Task list/table view
[x] Overdue task detection and highlighting
[x] Comments on tasks
[x] Dashboard with stats cards
[x] Recent activity feed
[x] Admin user management panel
[x] Admin global task overview with filters
[x] My Tasks page (filtered to assigned tasks)
[x] Profile page with password change
[x] Input validation on all endpoints
[x] Proper HTTP status codes and error messages
[x] Production build served from Express (monorepo)
[x] Railway deployment configuration

===================================================================
