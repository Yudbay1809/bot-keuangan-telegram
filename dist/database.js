"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDatabase = initDatabase;
exports.getOrCreateUser = getOrCreateUser;
exports.getCategories = getCategories;
exports.addCategory = addCategory;
exports.addTransaction = addTransaction;
exports.getTransactions = getTransactions;
exports.deleteTransaction = deleteTransaction;
exports.getMonthlyStats = getMonthlyStats;
exports.getCategoryStats = getCategoryStats;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const types_1 = require("./types");
const DB_PATH = process.env.DB_PATH || './data/keuangan.db';
let db;
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}
function initDatabase() {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path_1.default.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new better_sqlite3_1.default(DB_PATH);
    db.pragma('journal_mode = WAL');
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
    const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL').get();
    if (existingCategories.count === 0) {
        const insertCat = db.prepare('INSERT INTO categories (user_id, name, emoji) VALUES (?, ?, ?)');
        for (const cat of types_1.DEFAULT_CATEGORIES) {
            insertCat.run(null, cat.name, cat.emoji);
        }
    }
}
// User operations
function getOrCreateUser(userId, name, username) {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (existing)
        return existing;
    db.prepare('INSERT INTO users (id, name, username) VALUES (?, ?, ?)').run(userId, name, username || null);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}
// Category operations
function getCategories(userId) {
    const defaultCats = db.prepare('SELECT * FROM categories WHERE user_id IS NULL').all();
    const customCats = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
    return [...defaultCats, ...customCats];
}
function addCategory(userId, name, emoji) {
    const result = db.prepare('INSERT INTO categories (user_id, name, emoji) VALUES (?, ?, ?)').run(userId, name, emoji);
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
}
// Transaction operations
function addTransaction(userId, type, amount, category, description, date) {
    console.log(`[DB] Adding transaction: userId=${userId}, type=${type}, amount=${amount}, category=${category}`);
    const txDate = date || new Date().toISOString().split('T')[0];
    const result = db
        .prepare('INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, type, amount, category, description || null, txDate);
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
}
function getTransactions(userId, startDate, endDate) {
    console.log(`[DB] Getting transactions for userId=${userId}, startDate=${startDate}, endDate=${endDate}`);
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];
    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const result = db.prepare(query).all(...params);
    console.log(`[DB] Found ${result.length} transactions`);
    return result;
}
function deleteTransaction(userId, transactionId) {
    console.log(`[DB] Deleting transaction: id=${transactionId}, userId=${userId}`);
    const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(transactionId, userId);
    console.log(`[DB] Deleted ${result.changes} row(s)`);
    return result.changes > 0;
}
function getMonthlyStats(userId, year, month) {
    console.log(`[DB] Getting monthly stats: userId=${userId}, year=${year}, month=${month}`);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const income = db
        .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date BETWEEN ? AND ?")
        .get(userId, startDate, endDate);
    const expense = db
        .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ?")
        .get(userId, startDate, endDate);
    console.log(`[DB] Monthly stats: income=${income.total}, expense=${expense.total}`);
    return { income: income.total, expense: expense.total };
}
function getCategoryStats(userId, startDate, endDate) {
    let query = 'SELECT category, type, SUM(amount) as total FROM transactions WHERE user_id = ?';
    const params = [userId];
    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }
    query += ' GROUP BY category, type ORDER BY total DESC';
    return db.prepare(query).all(...params);
}
//# sourceMappingURL=database.js.map