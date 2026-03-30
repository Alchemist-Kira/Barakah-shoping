import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
  let sqliteDb, mysqlPool;

  try {
    console.log('--- Starting Migration ---');
    console.log('Config:', {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      db: process.env.DB_NAME || 'barakah_db'
    });

    // Connect to SQLite
    const sqlitePath = path.join(__dirname, 'ecommerce.sqlite');
    if (!fs.existsSync(sqlitePath)) {
      throw new Error(`SQLite file not found at ${sqlitePath}`);
    }

    sqliteDb = await open({
      filename: sqlitePath,
      driver: sqlite3.Database
    });

    // Connect to MySQL (Setup first)
    const mysqlSetup = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    console.log('Connected to MySQL for setup...');
    await mysqlSetup.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'barakah_db'}\``);
    await mysqlSetup.end();

    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barakah_db',
    });
    console.log('MySQL Pool Created...');

    // Initialize Tables in MySQL
    console.log('Initializing Tables...');
    const connection = await mysqlPool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value LONGTEXT
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        category VARCHAR(255),
        subcategory VARCHAR(255),
        regularPrice DECIMAL(10, 2),
        salePrice DECIMAL(10, 2),
        sku VARCHAR(255),
        stockQuantity INT DEFAULT 0,
        inStock TINYINT(1) DEFAULT 1,
        mainImage TEXT,
        thumbnail TEXT,
        galleryImages LONGTEXT,
        images LONGTEXT,
        sizes LONGTEXT,
        colors LONGTEXT,
        isNew TINYINT(1) DEFAULT 0,
        rating DECIMAL(3, 2) DEFAULT 0,
        reviews INT DEFAULT 0
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customerName VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        total DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'Pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    connection.release();

    // 1. Migrate Settings
    console.log('Migrating Settings...');
    const settings = await sqliteDb.all('SELECT * FROM settings');
    for (const s of settings) {
      await mysqlPool.query('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [s.key, s.value]);
    }

    // 2. Migrate Products
    console.log('Migrating Products...');
    const products = await sqliteDb.all('SELECT * FROM products');
    for (const p of products) {
      await mysqlPool.query(`
        INSERT INTO products (
          id, name, description, category, subcategory, regularPrice, salePrice, 
          sku, stockQuantity, inStock, mainImage, thumbnail, galleryImages, images, sizes, colors, isNew, rating, reviews
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.id, p.name, p.description, p.category, p.subcategory, p.regularPrice, p.salePrice,
        p.sku, p.stockQuantity, p.inStock, p.mainImage, p.thumbnail, p.galleryImages, p.images, 
        p.sizes, p.colors, p.isNew, p.rating, p.reviews
      ]);
    }

    // 3. Migrate Orders
    console.log('Migrating Orders...');
    const orders = await sqliteDb.all('SELECT * FROM orders');
    for (const o of orders) {
      // Handle schema differences if any
      await mysqlPool.query(`
        INSERT INTO orders (
          id, customerName, phone, address, items, total, status, paymentMethod
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        o.id, o.customerName, o.phone || o.customerPhone, o.address || o.customerAddress, o.items, o.total || o.grandTotal, o.status, o.paymentMethod
      ]);
    }

    console.log('--- Migration COMPLETED Successfully ---');
    console.log('You can now start your server with: npm run dev');

  } catch (err) {
    console.error('--- Migration FAILED ---');
    console.error(err);
  } finally {
    if (sqliteDb) await sqliteDb.close();
    if (mysqlPool) await mysqlPool.end();
  }
}

migrate();
