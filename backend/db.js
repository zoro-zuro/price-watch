const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Promisify some basic functions
db.runAsync = promisify(db.run);
db.getAsync = promisify(db.get);
db.allAsync = promisify(db.all);

// Initialize tables
db.serialize(() => {
  // Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Watched products
  db.run(`
    CREATE TABLE IF NOT EXISTS watched_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_title TEXT NOT NULL,
      product_url TEXT UNIQUE NOT NULL,
      product_image TEXT,
      store TEXT,
      target_price REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Price history
  db.run(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_url TEXT NOT NULL,
      price REAL NOT NULL,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PERFORMANCE FIX: Search Results Cache
  db.run(`
    CREATE TABLE IF NOT EXISTS search_cache (
      query TEXT PRIMARY KEY,
      results_json TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PERFORMANCE FIX: AI Summaries Cache
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_summaries_cache (
      product_url TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PERFORMANCE FIX: Indexes for O(1) Lookups
  db.run(`CREATE INDEX IF NOT EXISTS idx_history_url ON price_history(product_url)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_watched_url ON watched_products(product_url)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_watched_user ON watched_products(user_id)`);
});

module.exports = db;
