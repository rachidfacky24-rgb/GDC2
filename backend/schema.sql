-- Schema for Gestion de courses
PRAGMA foreign_keys = ON;

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);
