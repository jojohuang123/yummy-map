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

  _db.run(`
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      poi_id TEXT NOT NULL,
      favorite_id TEXT,
      shop_name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      latitude REAL,
      longitude REAL,
      rating INTEGER NOT NULL,
      category TEXT,
      comment TEXT,
      images TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);

  _db.run(`CREATE INDEX IF NOT EXISTS idx_checkins_poi ON checkins(poi_id)`);
  _db.run(`CREATE INDEX IF NOT EXISTS idx_checkins_city ON checkins(city)`);
  _db.run(`CREATE INDEX IF NOT EXISTS idx_checkins_category ON checkins(category)`);
  _db.run(`CREATE INDEX IF NOT EXISTS idx_checkins_created ON checkins(created_at DESC)`);

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

// --- checkins ---

export const setCheckin = async (id, value) => {
  const db = await getDb();
  const json = JSON.stringify(value);
  db.run(
    `INSERT INTO checkins (id, poi_id, favorite_id, shop_name, address, city, latitude, longitude, rating, category, comment, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      value.poi_id,
      value.favorite_id || null,
      value.shop_name,
      value.address || null,
      value.city || null,
      value.latitude || null,
      value.longitude || null,
      value.rating,
      value.category || null,
      value.comment || null,
      value.images ? JSON.stringify(value.images) : null,
      value.created_at || new Date().toISOString(),
      value.updated_at || null
    ]
  );
  saveToDisk();
};

export const getCheckin = async (id) => {
  const db = await getDb();
  const result = db.exec(
    `SELECT id, poi_id, favorite_id, shop_name, address, city, latitude, longitude, rating, category, comment, images, created_at, updated_at FROM checkins WHERE id = ?`,
    [id]
  );
  if (!result.length || !result[0].values.length) return undefined;
  const row = result[0].values[0];
  const columns = result[0].columns;
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  if (obj.images) {
    try {
      obj.images = JSON.parse(obj.images);
    } catch {
      obj.images = [];
    }
  }
  return obj;
};

export const getCheckinsList = async ({ page = 1, limit = 20, city, category } = {}) => {
  const db = await getDb();
  const offset = (page - 1) * limit;

  let whereClause = "1=1";
  const params = [];

  if (city) {
    whereClause += " AND city = ?";
    params.push(city);
  }

  if (category) {
    whereClause += " AND category = ?";
    params.push(category);
  }

  const countResult = db.exec(`SELECT COUNT(*) FROM checkins WHERE ${whereClause}`, params);
  const total = countResult.length ? Number(countResult[0].values[0][0]) : 0;

  const result = db.exec(
    `SELECT id, poi_id, favorite_id, shop_name, address, city, latitude, longitude, rating, category, comment, images, created_at, updated_at FROM checkins WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const items = [];
  if (result.length) {
    const columns = result[0].columns;
    for (const row of result[0].values) {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      if (obj.images) {
        try {
          obj.images = JSON.parse(obj.images);
        } catch {
          obj.images = [];
        }
      }
      items.push(obj);
    }
  }

  return {
    list: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getCheckinsStats = async () => {
  const db = await getDb();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const totalResult = db.exec(`SELECT COUNT(*) FROM checkins`);
  const totalCount = totalResult.length ? Number(totalResult[0].values[0][0]) : 0;

  const monthResult = db.exec(`SELECT COUNT(*) FROM checkins WHERE date(created_at) >= ?`, [monthStart]);
  const monthCount = monthResult.length ? Number(monthResult[0].values[0][0]) : 0;

  const cityResult = db.exec(`SELECT city, COUNT(*) as cnt FROM checkins WHERE city IS NOT NULL AND city != '' GROUP BY city ORDER BY cnt DESC`);
  const cities = [];
  if (cityResult.length) {
    for (const row of cityResult[0].values) {
      cities.push({ name: row[0], count: Number(row[1]) });
    }
  }

  const categoryResult = db.exec(`SELECT category, COUNT(*) as cnt FROM checkins WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC`);
  const categories = [];
  if (categoryResult.length) {
    for (const row of categoryResult[0].values) {
      categories.push({ name: row[0], count: Number(row[1]) });
    }
  }

  return {
    monthCount,
    totalCount,
    cities,
    categories
  };
};

export const getCheckinsByPoiId = async (poiId) => {
  const db = await getDb();
  const result = db.exec(
    `SELECT id, poi_id, favorite_id, shop_name, address, city, latitude, longitude, rating, category, comment, images, created_at, updated_at FROM checkins WHERE poi_id = ? ORDER BY created_at DESC`,
    [poiId]
  );
  const items = [];
  if (result.length) {
    const columns = result[0].columns;
    for (const row of result[0].values) {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      if (obj.images) {
        try {
          obj.images = JSON.parse(obj.images);
        } catch {
          obj.images = [];
        }
      }
      items.push(obj);
    }
  }
  return items;
};

export const updateCheckin = async (id, updates) => {
  const db = await getDb();
  const current = await getCheckin(id);
  if (!current) return null;

  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString()
  };

  db.run(
    `UPDATE checkins SET poi_id = ?, favorite_id = ?, shop_name = ?, address = ?, city = ?, latitude = ?, longitude = ?, rating = ?, category = ?, comment = ?, images = ?, updated_at = ? WHERE id = ?`,
    [
      updated.poi_id,
      updated.favorite_id || null,
      updated.shop_name,
      updated.address || null,
      updated.city || null,
      updated.latitude || null,
      updated.longitude || null,
      updated.rating,
      updated.category || null,
      updated.comment || null,
      updated.images ? JSON.stringify(updated.images) : null,
      updated.updated_at,
      id
    ]
  );
  saveToDisk();
  return updated;
};

export const deleteCheckin = async (id) => {
  const db = await getDb();
  db.run(`DELETE FROM checkins WHERE id = ?`, [id]);
  saveToDisk();
};
