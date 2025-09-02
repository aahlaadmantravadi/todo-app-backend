// server.js for todo-app-backend (FINAL, SIMPLIFIED VERSION)

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();

// --- DATABASE (SQL) SETUP ---
const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to the SQLite database.");
});

// Create the tasks table. It no longer needs a 'generated_sql' column.
db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0
)`);

app.use(cors());
app.use(express.json());

// --- API ROUTES for OBJECTIVES (The Slate) ---

// GET all saved objectives
app.get("/tasks", (req, res) => {
    db.all("SELECT * FROM tasks ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST a new objective to save it
app.post("/tasks", (req, res) => {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: "Description is required." });
    
    const sql = `INSERT INTO tasks (description, is_completed) VALUES (?, 0)`;
    db.run(sql, [description], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, description, is_completed: 0 });
    });
});

// UPDATE an objective's status
app.put("/tasks/:id", (req, res) => {
    const { is_completed } = req.body;
    db.run(`UPDATE tasks SET is_completed = ? WHERE id = ?`, [is_completed, req.params.id], function (err) {
         if (err) return res.status(500).json({ error: err.message });
         res.json({ message: "Task updated" });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`To-Do List Backend is listening on port ${PORT}`);
});
