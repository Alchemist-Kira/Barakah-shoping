import mysql from 'mysql2/promise'; 
import dotenv from 'dotenv'; 
import path from 'path'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'server', '.env') }); 

async function fix() {
  const conn = await mysql.createConnection({ 
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME 
  }); 
  
  await conn.query('DROP TABLE IF EXISTS orders'); 
  await conn.query(`
    CREATE TABLE orders (
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
  
  console.log("Orders table recreated successfully."); 
  await conn.end();
}

fix();
