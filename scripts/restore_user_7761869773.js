const Database = require("better-sqlite3");

const db = new Database("/data/keuangan.db");
const userId = 7761869773;

const transactions = [
  { type: "income", amount: 4800000, category: "Gaji", description: null, date: "2026-04-19" },
  { type: "expense", amount: 150000, category: "Belanja", description: null, date: "2026-04-19" },
];

const before = db.prepare("SELECT COUNT(*) AS c FROM transactions WHERE user_id = ?").get(userId).c;

db.prepare("INSERT OR IGNORE INTO users (id, name, username) VALUES (?, ?, ?)").run(
  userId,
  "Restored User 7761869773",
  null
);

const selectExisting = db.prepare(`
  SELECT id
  FROM transactions
  WHERE user_id = ?
    AND type = ?
    AND amount = ?
    AND category = ?
    AND COALESCE(description, '') = COALESCE(?, '')
    AND date = ?
  LIMIT 1
`);

const insertTx = db.prepare(
  "INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)"
);

let inserted = 0;
for (const tx of transactions) {
  const exists = selectExisting.get(userId, tx.type, tx.amount, tx.category, tx.description, tx.date);
  if (!exists) {
    insertTx.run(userId, tx.type, tx.amount, tx.category, tx.description, tx.date);
    inserted += 1;
  }
}

const after = db.prepare("SELECT COUNT(*) AS c FROM transactions WHERE user_id = ?").get(userId).c;
const stats = db
  .prepare(
    "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS income, COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense FROM transactions WHERE user_id=?"
  )
  .get(userId);

console.log(JSON.stringify({ userId, before, inserted, after, stats }));
