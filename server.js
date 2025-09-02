// server.js for your 'todo-list-sql-backend'
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

// --- DATABASE (SQL) SETUP ---
// This creates a `tasks.db` file in this project to store your to-do items.
const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to the SQLite database.");
});

// Create the `tasks` table if it doesn't already exist.
db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    generated_sql TEXT,
    is_completed INTEGER DEFAULT 0
)`);


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());


// --- API ROUTES ---

// GET: /tasks - Fetches all tasks from the SQL database
app.get("/tasks", (req, res) => {
    db.all("SELECT * FROM tasks ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST: /tasks - Adds a new task
app.post("/tasks", async (req, res) => {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: "Description is required." });

    // IMPORTANT: This is the URL for your OTHER server
    const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL;
    if (!GEMINI_PROXY_URL) {
        return res.status(500).json({ error: "Gemini proxy URL is not configured." });
    }

    let generatedSql = "N/A";
    try {
        // Step 1: Call your existing Gemini proxy server to get the SQL query
        const prompt = `Based on this data analyst task, write a generic SQL query. Format as one line. If not data-related, say "N/A". Task: "${description}"`;
        const proxyResponse = await fetch(GEMINI_PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt }),
        });

        if (proxyResponse.ok) {
            const responseData = await proxyResponse.json();
            if (responseData.candidates && responseData.candidates[0].content) {
                generatedSql = responseData.candidates[0].content.parts[0].text.trim().replace(/\n/g, " ");
            }
        }
    } catch (error) {
        console.error("Error calling Gemini proxy:", error);
    }

    // Step 2: Save the task and the generated SQL to this backend's database
    const sql = `INSERT INTO tasks (description, generated_sql) VALUES (?, ?)`;
    db.run(sql, [description, generatedSql], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, description, generated_sql: generatedSql });
    });
});

// PUT: /tasks/:id - Updates a task (marks as complete/incomplete)
app.put("/tasks/:id", (req, res) => {
    const { is_completed } = req.body;
    db.run(`UPDATE tasks SET is_completed = ? WHERE id = ?`, [is_completed, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Task updated" });
    });
});

// DELETE: /tasks/:id - Deletes a task
app.delete("/tasks/:id", (req, res) => {
    db.run(`DELETE FROM tasks WHERE id = ?`, req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Task deleted" });
    });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`To-Do List SQL Backend is running on port ${PORT}`));