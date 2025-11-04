// init_db.js - optionally used to reset or pre-populate DB
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
db.serialize(()=>{
  db.run('DROP TABLE IF EXISTS leaves');
  db.run(`CREATE TABLE leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name TEXT,
    start_date TEXT,
    end_date TEXT,
    type TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT
  )`);
  console.log('DB initialized.');
});
db.close();