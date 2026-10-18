const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chatgpt_clone',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined, // needed for Aiven
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: false,
});

// Fail fast with a clear message if the DB is unreachable.
async function verifyConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log('MySQL connection established.');
  } finally {
    connection.release();
  }
}

module.exports = { pool, verifyConnection };