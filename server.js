// server.js
// Simple Express API with SQLite to store leaves and serve holidays
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'data.db');
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DB_FILE, (err)=>{
  if(err) console.error('DB open error', err);
  else console.log('Connected to SQLite DB');
});

// Create table if not exists
db.serialize(()=>{
  db.run(`CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name TEXT,
    start_date TEXT,
    end_date TEXT,
    type TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT
  )`);
});

// API: get leaves
app.get('/api/leaves', (req,res)=>{
  db.all('SELECT * FROM leaves ORDER BY created_at DESC', [], (err,rows)=>{
    if(err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// API: add leave
app.post('/api/leaves', (req,res)=>{
  const { employee_name, start_date, end_date, type, reason } = req.body;
  if(!employee_name || !start_date || !end_date) {
    return res.status(400).json({error: 'employee_name, start_date and end_date are required.'});
  }
  const created_at = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO leaves (employee_name, start_date, end_date, type, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(employee_name, start_date, end_date, type || 'Casual', reason || '', created_at, function(err){
    if(err) return res.status(500).json({error: err.message});
    // return the inserted row
    db.get('SELECT * FROM leaves WHERE id = ?', [this.lastID], (err,row)=>{
      if(err) return res.status(500).json({error: err.message});
      res.json(row);
    });
  });
});

// Approve leave
app.put('/api/leaves/:id/approve', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE leaves SET status = ? WHERE id = ?', ['Approved', id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Leave not found' });
    db.get('SELECT * FROM leaves WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// Delete leave
app.delete('/api/leaves/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM leaves WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Leave not found' });
    res.json({ success: true, message: 'Leave deleted successfully', id });
  });
});

// // API: approve leave
// app.put('/api/leaves/:id/approve', (req, res) => {
//   const { id } = req.params;
//   db.run('UPDATE leaves SET status = ? WHERE id = ?', ['Approved', id], function (err) {
//     if (err) return res.status(500).json({ error: err.message });
//     if (this.changes === 0) return res.status(404).json({ error: 'Leave not found' });
//     db.get('SELECT * FROM leaves WHERE id = ?', [id], (err, row) => {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json(row);
//     });
//   });
// });


// // API: delete leave
// app.delete('/api/leaves/:id', (req, res) => {
//   const { id } = req.params;
//   db.run('DELETE FROM leaves WHERE id = ?', [id], function (err) {
//     if (err) return res.status(500).json({ error: err.message });
//     if (this.changes === 0) return res.status(404).json({ error: 'Leave not found' });
//     res.json({ success: true, message: 'Leave deleted successfully', id });
//   });
// });


// API: holidays (basic Indian holidays list for the year, static)
app.get('/api/holidays', (req,res)=>{
  const holidays = [
    {"title":"Republic Day","start":"2025-01-26"},
    {"title":"Holi","start":"2025-03-17"},
    {"title":"Good Friday","start":"2025-04-18"},
    {"title":"Independence Day","start":"2025-08-15"},
    {"title":"Gandhi Jayanti","start":"2025-10-02"},
    {"title":"Diwali","start":"2025-11-01"},
    {"title":"Christmas","start":"2025-12-25"}
  ];
  res.json(holidays);
});

// fallback to frontend
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public','index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server listening on port', PORT));