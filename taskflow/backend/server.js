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
  const frontendPath = path.join(__dirname, '../frontend/dist');
  console.log(`📁 Serving frontend from: ${frontendPath}`);
  
  // Serve static assets
  app.use(express.static(frontendPath));
  
  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving index.html for ${req.path}: ${err.code || err.message}`);
        res.status(500).json({ error: 'Failed to serve app' });
      }
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(`❌ Unhandled error on ${req.method} ${req.path}:`, err.message);
  res.status(err.status || err.statusCode || 500).json({ 
    error: err.message || 'Internal server error'
  });
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
