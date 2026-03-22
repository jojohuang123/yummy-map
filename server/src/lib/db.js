import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH || path.resolve("data/yummy.db");

let _db = null;

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const saveToDisk = () => {
  if (!_db) return;
  const data = _db.export();
  ensureDir(DB_PATH);
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

export const getDb = async () => {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      poi_id TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveToDisk();
  return _db;
};

export const persistDb = () => saveToDisk();

// --- imports ---

export const setImport = async (id, value) => {
  const db = await getDb();
  const json = JSON.stringify(value);
  db.run(
    `INSERT INTO imports (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    [id, json]
  );
  saveToDisk();
};

export const getImport = async (id) => {
  const db = await getDb();
  const result = db.exec(`SELECT data FROM imports WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return undefined;
  return JSON.parse(result[0].values[0][0]);
};

// --- favorites ---

export const setFavorite = async (poiId, value) => {
  const db = await getDb();
  const json = JSON.stringify(value);
  db.run(
    `INSERT INTO favorites (id, poi_id, data) VALUES (?, ?, ?) ON CONFLICT(poi_id) DO UPDATE SET data = excluded.data`,
    [value.id, poiId, json]
  );
  saveToDisk();
};

export const hasFavorite = async (poiId) => {
  const db = await getDb();
  const result = db.exec(`SELECT 1 FROM favorites WHERE poi_id = ?`, [poiId]);
  return result.length > 0 && result[0].values.length > 0;
};

export const getAllFavorites = async () => {
  const db = await getDb();
  const result = db.exec(`SELECT data FROM favorites ORDER BY created_at DESC`);
  if (!result.length) return [];
  return result[0].values.map((row) => JSON.parse(row[0]));
};

export const deleteFavoriteById = async (favoriteId) => {
  const db = await getDb();
  const result = db.exec(`SELECT poi_id FROM favorites WHERE id = ?`, [favoriteId]);
  if (!result.length || !result[0].values.length) return false;
  db.run(`DELETE FROM favorites WHERE id = ?`, [favoriteId]);
  saveToDisk();
  return true;
};

export const getFavoritesCount = async () => {
  const db = await getDb();
  const result = db.exec(`SELECT COUNT(*) FROM favorites`);
  if (!result.length) return 0;
  return Number(result[0].values[0][0]);
};

// --- uploads ---

export const setUpload = async (id, value) => {
  const db = await getDb();
  const json = JSON.stringify(value);
  db.run(
    `INSERT INTO uploads (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    [id, json]
  );
  saveToDisk();
};

export const getUpload = async (id) => {
  const db = await getDb();
  const result = db.exec(`SELECT data FROM uploads WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return undefined;
  return JSON.parse(result[0].values[0][0]);
};

export const deleteUpload = async (id) => {
  const db = await getDb();
  db.run(`DELETE FROM uploads WHERE id = ?`, [id]);
  saveToDisk();
};
