import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open SQLite DB
let db;
const connectToDB = async () => {
  db = await open({
    filename: path.join(__dirname, "navxlogs.db"),
    driver: sqlite3.Database
  });

  await db.exec(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    algorithm TEXT,
    start_point TEXT,
    goal_point TEXT,
    obstacles TEXT,
    path TEXT,
    path_length INTEGER,
    time_taken TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
};

await connectToDB();

app.get("/api/paths", async (req, res) => {
  const rows = await db.all("SELECT * FROM logs ORDER BY created_at DESC");
  res.json(rows);
});

app.post("/api/path", async (req, res) => {
  const {
    algorithm,
    start_point,
    goal_point,
    obstacles,
    path,
    path_length,
    time_taken
  } = req.body;

  await db.run(
    `INSERT INTO logs (algorithm, start_point, goal_point, obstacles, path, path_length, time_taken)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [algorithm, start_point, goal_point, obstacles, path, path_length, time_taken]
  );

  res.status(201).json({ message: "Path saved!" });
});

app.delete("/api/paths", async (req, res) => {
  await db.run("DELETE FROM logs");
  res.status(200).json({ message: "All paths deleted." });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
