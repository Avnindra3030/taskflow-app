require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/projects/:projectId/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/users', require('./middleware/auth').authenticate, (req, res) => {
  const { getDb } = require('./db');
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY name').all();
  res.json({ users });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const frontendPath = path.join(__dirname, '../frontend/dist');
  
  console.log(`📁 Frontend path: ${frontendPath}`);
  console.log(`📁 Frontend exists: ${fs.existsSync(frontendPath)}`);
  
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath, { 
      maxAge: '1h',
      etag: false 
    }));
    
    // SPA fallback
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
          if (err) {
            console.error(`Error sending index.html: ${err.message}`);
            res.status(404).json({ error: 'Frontend not found' });
          }
        });
      }
    });
  } else {
    console.warn('⚠️  Frontend dist folder not found. API-only mode.');
    app.get('/', (req, res) => {
      res.json({ message: 'TaskFlow API running', version: '1.0.0' });
    });
  }
}

app.use((err, req, res, next) => {
  console.error(`❌ Error: ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 TaskFlow server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database initialized successfully`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

module.exports = app;
