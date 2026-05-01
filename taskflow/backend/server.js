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
    // Serve static assets
    app.use(express.static(frontendPath, { maxAge: '1d' }));
    
    // SPA fallback - for all other routes, serve index.html
    app.use((req, res) => {
      // Skip API routes - let them 404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      const indexFile = path.join(frontendPath, 'index.html');
      console.log(`🔍 Checking for: ${indexFile}`);
      
      if (!fs.existsSync(indexFile)) {
        console.error(`❌ index.html not found at: ${indexFile}`);
        return res.status(500).json({ error: 'index.html not found' });
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const stream = fs.createReadStream(indexFile);
      stream.pipe(res);
      stream.on('error', (err) => {
        console.error(`❌ Error streaming index.html: ${err.message}`);
        res.status(500).json({ error: 'Failed to serve index.html' });
      });
    });
  } else {
    console.warn('⚠️  Frontend dist not found. API-only mode.');
    app.get('/', (req, res) => {
      res.json({ status: 'ok', message: 'TaskFlow API running' });
    });
  }
} else {
  // Development - just serve health check
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'TaskFlow API running' });
  });
}

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
