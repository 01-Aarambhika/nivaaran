/**
 * test_db_connection.js - Check MySQL connection for all 6 Nivaaran databases
 */

const mysql = require('mysql2/promise');

const host = process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';

const databases = [
  'nivaaran_accounts',
  'nivaaran_directory',
  'nivaaran_complaints',
  'nivaaran_resolution',
  'nivaaran_notifications',
  'nivaaran_analytics'
];

async function check() {
  console.log('='.repeat(60));
  console.log(' NIVAARAN MYSQL CONNECTION CHECK');
  console.log('='.repeat(60));
  console.log(`Connecting as user '${user}' to ${host}:${port}...\n`);

  try {
    const conn = await mysql.createConnection({ host, port, user, password });
    console.log('✔ MySQL Server connection established!\n');

    for (const db of databases) {
      try {
        await conn.query(`USE \`${db}\``);
        const [tables] = await conn.query('SHOW TABLES');
        console.log(`✔ Database [${db}] OK — ${tables.length} tables found`);
      } catch (err) {
        console.log(`❌ Database [${db}] NOT FOUND or inaccessible: ${err.message}`);
      }
    }
    await conn.end();
  } catch (err) {
    console.error(`❌ Could not connect to MySQL Server: ${err.message}`);
    console.log('\n💡 Provide your password like:');
    console.log('   node scripts/setup_mysql.js --password="YOUR_ROOT_PASSWORD"');
  }
}

check();
