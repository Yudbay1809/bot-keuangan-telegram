import Database from 'better-sqlite3';
import path from 'path';
import { DEFAULT_CATEGORIES, Category, User, Transaction } from './types';

const DB_PATH = process.env.DB_PATH || (process.env.RAILWAY_ENVIRONMENT ? '/data/keuangan.db' : './data/keuangan.db');
const SQLITE_JOURNAL_MODE = (process.env.SQLITE_JOURNAL_MODE || (process.env.RAILWAY_ENVIRONMENT ? 'DELETE' : 'WAL')).toUpperCase();

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): void {
  console.log(`[DB] Using database path: ${DB_PATH}`);
  if (process.env.RAILWAY_ENVIRONMENT && !DB_PATH.startsWith('/data/')) {
    console.warn(`[DB] Warning: running on Railway but DB_PATH is not under /data (${DB_PATH}). Data may be ephemeral.`);
  }

  // Ensure data directory exists
  const fs = require('fs');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  const appliedJournalMode = db.pragma(`journal_mode = ${SQLITE_JOURNAL_MODE}`, { simple: true }) as string;
  db.pragma('busy_timeout = 5000');
  console.log(`[DB] journal_mode=${appliedJournalMode}`);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
  `);

  // Insert default categories if not exist
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL').get() as { count: number };
  if (existingCategories.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (user_id, name, emoji) VALUES (?, ?, ?)');
    for (const cat of DEFAULT_CATEGORIES) {
      insertCat.run(null, cat.name, cat.emoji);
    }
  }

  const info = db.pragma('database_list') as Array<{ name: string; file: string }>;
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
  console.log(`[DB] Opened file: ${info.find(i => i.name === 'main')?.file || DB_PATH}`);
  console.log(`[DB] Existing transactions: ${txCount.count}`);
}

// User operations
export function getOrCreateUser(userId: number, name: string, username?: string): User {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (existing) return existing;

  db.prepare('INSERT INTO users (id, name, username) VALUES (?, ?, ?)').run(userId, name, username || null);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
}

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
}

export function getUserTransactionCount(userId: number): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(userId) as { count: number };
  return result.count;
}

// Category operations
export function getCategories(userId: number): Category[] {
  const defaultCats = db.prepare('SELECT * FROM categories WHERE user_id IS NULL').all() as Category[];
  const customCats = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId) as Category[];
  return [...defaultCats, ...customCats];
}

export function addCategory(userId: number, name: string, emoji: string): Category {
  const result = db.prepare('INSERT INTO categories (user_id, name, emoji) VALUES (?, ?, ?)').run(userId, name, emoji);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category;
}

// Transaction operations
export function addTransaction(
  userId: number,
  type: 'income' | 'expense',
  amount: number,
  category: string,
  description?: string,
  date?: string
): Transaction {
  console.log(`[DB] Adding transaction: userId=${userId}, type=${type}, amount=${amount}, category=${category}`);
  const txDate = date || new Date().toISOString().split('T')[0];
  const result = db
    .prepare(
      'INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(userId, type, amount, category, description || null, txDate);
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as Transaction;
}

export function getTransactions(userId: number, startDate?: string, endDate?: string): Transaction[] {
  console.log(`[DB] Getting transactions for userId=${userId}, startDate=${startDate}, endDate=${endDate}`);
  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date DESC, created_at DESC';
  const result = db.prepare(query).all(...params) as Transaction[];
  console.log(`[DB] Found ${result.length} transactions`);
  return result;
}

export function deleteTransaction(userId: number, transactionId: number): boolean {
  console.log(`[DB] Deleting transaction: id=${transactionId}, userId=${userId}`);
  const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(transactionId, userId);
  console.log(`[DB] Deleted ${result.changes} row(s)`);
  return result.changes > 0;
}

export function getMonthlyStats(userId: number, year: number, month: number): { income: number; expense: number } {
  console.log(`[DB] Getting monthly stats: userId=${userId}, year=${year}, month=${month}`);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const income = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date BETWEEN ? AND ?")
    .get(userId, startDate, endDate) as { total: number };

  const expense = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ?")
    .get(userId, startDate, endDate) as { total: number };

  console.log(`[DB] Monthly stats: income=${income.total}, expense=${expense.total}`);
  return { income: income.total, expense: expense.total };
}

export function getCategoryStats(userId: number, startDate?: string, endDate?: string): { category: string; total: number; type: string }[] {
  let query = 'SELECT category, type, SUM(amount) as total FROM transactions WHERE user_id = ?';
  const params: (string | number)[] = [userId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY category, type ORDER BY total DESC';
  return db.prepare(query).all(...params) as { category: string; total: number; type: string }[];
}
