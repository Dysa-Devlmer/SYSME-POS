// core/memory.js
// Sistema de memoria persistente

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

class Memory {
  constructor() {
    this.db = null;
    this.memoryPath = './memory';
  }

  async initialize() {
    // Crear directorio si no existe
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }

    // Inicializar BD
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(path.join(this.memoryPath, 'jarvis.db'), (err) => {
        if (err) reject(err);
        else {
          this.createTables();
          resolve();
        }
      });
    });
  }

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        analysis TEXT,
        actions INTEGER,
        results INTEGER,
        timestamp DATETIME,
        success BOOLEAN
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS learning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT,
        solution TEXT,
        confidence REAL,
        timestamp DATETIME
      )
    `);
  }

  async saveEpisode(episode) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO episodes (command, analysis, actions, results, timestamp, success)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [episode.command, episode.analysis, episode.actions, episode.results, episode.timestamp, episode.success ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getRecentEpisodes(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM episodes ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

export default Memory;
