const db = require('./connection');

function createSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY,
      group_id INTEGER REFERENCES groups(id),
      user_id INTEGER REFERENCES users(id),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      group_id INTEGER REFERENCES groups(id),
      paid_by INTEGER REFERENCES users(id),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY,
      expense_id INTEGER REFERENCES expenses(id),
      user_id INTEGER REFERENCES users(id),
      amount_owed REAL NOT NULL
    );
  `);
    console.log("Database schema initialized.");
}

module.exports = createSchema;
