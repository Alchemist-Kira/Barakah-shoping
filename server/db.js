import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

let pool = null;

export async function getDb() {
  if (pool) return pool;

  try {
    // Initial connection without specific DB to ensure DB exists
    const connectionSetup = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    await connectionSetup.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'barakah_db'}\``);
    await connectionSetup.end();

    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barakah_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('--- MySQL Connected Succesfully ---');
    
    // Initialize Tables
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
        id VARCHAR(100) PRIMARY KEY,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        customerName VARCHAR(255),
        customerPhone VARCHAR(50),
        customerAddress TEXT,
        customerLocation VARCHAR(100),
        customerNote TEXT,
        items LONGTEXT,
        subtotal DECIMAL(10, 2),
        deliveryCharge DECIMAL(10, 2),
        grandTotal DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'Pending',
        paymentMethod VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    connection.release();
    return pool;
  } catch (err) {
    console.error('--- MySQL Connection ERROR ---');
    console.error(err.message);
    console.log('Please ensure your MySQL server is running and the database is created.');
    throw err;
  }
}
