const path = require('path');
const fs = require('fs');
const os = require('os');

// Use temp directory in production for ephemeral storage
const DB_PATH = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production' 
    ? path.join(os.tmpdir(), 'taskflow.db')
    : path.join(__dirname, 'taskflow.db')
);

let db = null;
let SQL = null;

async function initSql() {
  if (!SQL) {
    try {
      SQL = await require('sql.js')();
    } catch (err) {
      console.error('Failed to load sql.js:', err.message);
      throw err;
    }
  }
  return SQL;
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

async function getDb() {
  if (db) return db;
  
  try {
    const SQL = await initSql();
    
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH);
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }

    // Enable WAL-like settings
    db.run("PRAGMA foreign_keys = ON");
    
    initSchema();
    return db;
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      owner_id INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id INTEGER NOT NULL,
      assignee_id INTEGER,
      creator_id INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDb();
}

// Wrapper to make sql.js feel synchronous like better-sqlite3
function createDbWrapper(sqlDb) {
  return {
    prepare: (sql) => ({
      get: (...params) => {
        const flatParams = params.flat();
        const stmt = sqlDb.prepare(sql);
        stmt.bind(flatParams);
        const result = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return result;
      },
      all: (...params) => {
        const flatParams = params.flat();
        const stmt = sqlDb.prepare(sql);
        const rows = [];
        stmt.bind(flatParams);
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run: (...params) => {
        const flatParams = params.flat();
        sqlDb.run(sql, flatParams);
        const lastId = sqlDb.exec("SELECT last_insert_rowid() as id")[0];
        const lastInsertRowid = lastId ? lastId.values[0][0] : null;
        saveDb();
        return { lastInsertRowid };
      }
    }),
    exec: (sql) => {
      sqlDb.run(sql);
      saveDb();
    },
    pragma: () => {},
    run: (sql, params = []) => {
      sqlDb.run(sql, params);
      saveDb();
    }
  };
}

let wrappedDb = null;

async function getWrappedDb() {
  if (wrappedDb) return wrappedDb;
  const rawDb = await getDb();
  wrappedDb = createDbWrapper(rawDb);
  return wrappedDb;
}

// Synchronous version for middleware (db must already be initialized)
function getDbSync() {
  if (!wrappedDb) {
    throw new Error('Database not initialized. Make sure initDb() completed successfully.');
  }
  return wrappedDb;
}

async function initDb() {
  await getWrappedDb();
}

module.exports = { getDb: getDbSync, initDb };
