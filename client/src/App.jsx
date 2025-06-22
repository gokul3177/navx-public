import React, { useState } from "react";
import Grid from "./components/Grid";
import "./App.css";

import { bfs, dfs, dijkstra, astar } from "./utils/pathfinding";

const createEmptyGrid = () =>
  Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => []));

function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [currentTool, setCurrentTool] = useState("obstacle");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const handleCellClick = (row, col) => {
    if (showHistory) return;
    const newGrid = grid.map((r) => [...r]);

    if (currentTool === "start") {
      clearType("start");
      newGrid[row][col] = ["start"];
    } else if (currentTool === "goal") {
      clearType("goal");
      newGrid[row][col] = ["goal"];
    } else if (currentTool === "obstacle") {
      newGrid[row][col] = ["obstacle"];
    }

    setGrid(newGrid);
  };

  const clearType = (type) => {
    const newGrid = grid.map((row) =>
      row.map((cell) =>
        Array.isArray(cell) && cell.includes(type) ? [] : cell
      )
    );
    setGrid(newGrid);
  };

  const findCell = (type) => {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (Array.isArray(grid[r][c]) && grid[r][c].includes(type)) {
          return [r, c];
        }
      }
    }
    return null;
  };

  const simulateAlgo = async (algoName, algoFunc) => {
    const start = findCell("start");
    const goal = findCell("goal");

    if (!start || !goal) {
      alert("Set both start and goal points.");
      return;
    }

    const clearedGrid = grid.map((row) =>
      row.map((cell) =>
        Array.isArray(cell) &&
        (cell.includes("start") || cell.includes("goal") || cell.includes("obstacle"))
          ? [...cell]
          : []
      )
    );

    setGrid(clearedGrid);
    await new Promise((res) => setTimeout(res, 100));

    const t0 = performance.now();
    const result = algoFunc(clearedGrid, start, goal);
    const t1 = performance.now();
    const path = result.path;

    let currentGrid = clearedGrid.map(row => row.map(cell => [...cell]));

    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];

      if (!currentGrid[r][c].includes(algoName)) {
        currentGrid[r][c].push(algoName);
      }

      currentGrid[r][c].push("robot");
      setGrid(currentGrid.map(row => row.map(cell => [...cell])));
      await new Promise((res) => setTimeout(res, 80));

      currentGrid[r][c] = currentGrid[r][c].filter((v) => v !== "robot");
    }

    const finalGrid = currentGrid.map((row) =>
      row.map((cell) =>
        Array.isArray(cell)
          ? cell.filter((item) => ["start", "goal", "obstacle", algoName].includes(item))
          : []
      )
    );
    setGrid(finalGrid);

    const data = {
      algorithm: algoName,
      start_point: JSON.stringify(start),
      goal_point: JSON.stringify(goal),
      obstacles: JSON.stringify(
        grid.flatMap((row, r) =>
          row.map((cell, c) => (cell.includes("obstacle") ? [r, c] : null)).filter(Boolean)
        )
      ),
      path: JSON.stringify(path),
      path_length: path.length,
      time_taken: (t1 - t0).toFixed(2),
    };

    await fetch("https://navx-public-production.up.railway.app/api/path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const handleClear = () => setGrid(createEmptyGrid());

  const handleHistory = async () => {
    const res = await fetch("https://navx-public-production.up.railway.app/api/paths");
    const data = await res.json();
    setHistory(data);
    setShowHistory(true);
  };

  const handleDeleteHistory = async () => {
    const confirm = window.confirm("⚠️ This action is irreversible. Delete all history?");
    if (!confirm) return;

    await fetch("https://navx-public-production.up.railway.app/api/paths", { method: "DELETE" });

    const res = await fetch("https://navx-public-production.up.railway.app/api/paths");
    const data = await res.json();
    setHistory(data);
    setShowHistory(false);

    alert("History deleted.");
  };

  const exportToCSV = (rows) => {
    const header = ["Algorithm", "Start", "Goal", "Path", "Path Length", "Time Taken (ms)"];
    const csv = [header.join(",")];

    for (const row of rows) {
      const line = [
        row.algorithm,
        JSON.stringify(row.start_point),
        JSON.stringify(row.goal_point),
        JSON.stringify(row.path),
        row.path_length,
        row.time_taken,
      ];
      csv.push(line.join(","));
    }

    return csv.join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container" onClick={() => showHistory && setShowHistory(false)}>
      <h1 className="title">🤖 navX Simulator</h1>

      <div className="controls">
        <button onClick={handleClear}>🧹 Clear</button>
        <button onClick={handleHistory}>📜 History</button>
        
      </div>

      <div className="tools">
        <button onClick={() => setCurrentTool("start")}>🏁 Start</button>
        <button onClick={() => setCurrentTool("goal")}>🚩 Goal</button>
        <button onClick={() => setCurrentTool("obstacle")}>🧱 Obstacle</button>
      </div>

      <div className="algorithms">
        <button onClick={() => simulateAlgo("BFS", bfs)}>📘 BFS</button>
        <button onClick={() => simulateAlgo("DFS", dfs)}>📙 DFS</button>
        <button onClick={() => simulateAlgo("DIJKSTRA", dijkstra)}>📗 Dijkstra</button>
        <button onClick={() => simulateAlgo("ASTAR", astar)}>🌟 A*</button>
      </div>

      <Grid grid={grid} onCellClick={handleCellClick} />

      {showHistory && (
        <div className="history">
          <button className="delete-button" onClick={handleDeleteHistory}>
            🗑️ Delete History
          </button>
          <button onClick={() => downloadCSV(exportToCSV(history), "navx_export.csv")}>
          💾 Export .CSV
          </button>
          <h2>🕰️ Previous Results</h2>
          <table>
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Start</th>
                <th>Goal</th>
                <th>Path</th>
                <th>Path Length</th>
                <th>Time Taken (ms)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.algorithm}</td>
                  <td>{row.start_point}</td>
                  <td>{row.goal_point}</td>
                  <td>{JSON.stringify(row.path)}</td>
                  <td>{row.path_length}</td>
                  <td>{row.time_taken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="footer">🚀 Built with 💓 for RCS</footer>
    </div>
  );
}

export default App;
