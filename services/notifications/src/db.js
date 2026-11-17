/**
 * db.js - MySQL Connection Pool for Notifications Service
 */

'use strict';

const mysql = require('mysql2/promise');

let pool = null;
let isConnected = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'nivaaran_notifications',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000
    });
  }
  return pool;
}

async function checkConnection() {
  if (isConnected !== null) return isConnected;
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT 1 as val');
    isConnected = true;
    console.log('[NOTIFICATIONS] ✔ Connected to MySQL (nivaaran_notifications)');
    return true;
  } catch (err) {
    isConnected = false;
    return false;
  }
}

module.exports = { getPool, checkConnection };
