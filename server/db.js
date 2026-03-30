import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  try {
    const dbPath = path.join(__dirname, 'database.sqlite');
    
    // Ensure parent directory exists for safety
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('--- SQLite Connected Successfully ---');

    // Initialize Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        "key" TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        subcategory TEXT,
        regularPrice REAL,
        salePrice REAL,
        sku TEXT,
        stockQuantity INTEGER DEFAULT 0,
        inStock INTEGER DEFAULT 1,
        mainImage TEXT,
        thumbnail TEXT,
        galleryImages TEXT,
        images TEXT,
        sizes TEXT,
        colors TEXT,
        isNew INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        reviews INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        customerName TEXT,
        customerPhone TEXT,
        customerAddress TEXT,
        customerLocation TEXT,
        customerNote TEXT,
        items TEXT,
        subtotal REAL,
        deliveryCharge REAL,
        grandTotal REAL,
        status TEXT DEFAULT 'Pending',
        paymentMethod TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Compatibility Wrapper: Mimic mysql2's [rows, fields] return format
    const wrappedDb = {
      query: async (sql, params = []) => {
        // mysql2 uses backticks for keys, SQLite supports but double quotes are better
        // Handle common mysql2-style queries if needed
        const sqlNormalized = sql.replace(/`/g, '"');
        
        if (sqlNormalized.trim().toUpperCase().startsWith('SELECT')) {
          const rows = await db.all(sqlNormalized, params);
          return [rows, null]; // [rows, fields]
        } else {
          const result = await db.run(sqlNormalized, params);
          return [result, null];
        }
      },
      execute: async (sql, params = []) => {
        const sqlNormalized = sql.replace(/`/g, '"');
        const result = await db.run(sqlNormalized, params);
        // mysql2's execute returns [info] where info has insertId
        return [{ 
          insertId: result.lastID, 
          affectedRows: result.changes 
        }, null];
      }
    };

    dbInstance = wrappedDb;
    return wrappedDb;
  } catch (err) {
    console.error('--- SQLite Connection ERROR ---');
    console.error(err.message);
    throw err;
  }
}
