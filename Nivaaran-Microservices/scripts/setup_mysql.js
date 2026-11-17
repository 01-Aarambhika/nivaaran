/**
 * setup_mysql.js - Automated MySQL Setup & Initialization for Nivaaran
 *
 * Usage:
 *   node scripts/setup_mysql.js --password=your_root_password
 *   node scripts/setup_mysql.js (will read MYSQL_PASSWORD from environment or .env)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse CLI args
const args = process.argv.slice(2);
let host = process.env.MYSQL_HOST || 'localhost';
let port = Number(process.env.MYSQL_PORT) || 3306;
let user = process.env.MYSQL_USER || 'root';
let password = process.env.MYSQL_PASSWORD || '';

for (const arg of args) {
  if (arg.startsWith('--password=')) password = arg.split('=')[1];
  if (arg.startsWith('--user=')) user = arg.split('=')[1];
  if (arg.startsWith('--host=')) host = arg.split('=')[1];
  if (arg.startsWith('--port=')) port = Number(arg.split('=')[1]);
}

async function run() {
  console.log('='.repeat(65));
  console.log(' NIVAARAN: MYSQL DATABASE SETUP & INITIALIZATION');
  console.log('='.repeat(65));
  console.log(`Host:     ${host}`);
  console.log(`Port:     ${port}`);
  console.log(`User:     ${user}`);
  console.log(`Password: ${password ? '********' : '(empty / not set)'}`);
  console.log('-'.repeat(65));

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    console.log('✔ Connected to MySQL server successfully!\n');
  } catch (err) {
    console.error('\n❌ Could not connect to MySQL server:');
    console.error(`   Error code: ${err.code}`);
    console.error(`   Message:    ${err.message}`);
    console.log('\n💡 Tip: Provide your MySQL password using:');
    console.log(`   node scripts/setup_mysql.js --password="YOUR_PASSWORD"\n`);
    process.exit(1);
  }

  try {
    const sqlFile = path.join(__dirname, '..', 'database', 'init_mysql.sql');
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL file not found at: ${sqlFile}`);
    }

    console.log('▶ Reading database schema from database/init_mysql.sql...');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    console.log('▶ Executing DDL and seed scripts for all 6 microservices...');
    await connection.query(sqlContent);
    console.log('✔ All 6 databases, tables, indexes, and seed records initialized!\n');

    // Verify databases exist
    const [databases] = await connection.query(`SHOW DATABASES LIKE 'nivaaran_%'`);
    console.log('Existing Nivaaran databases:');
    for (const row of databases) {
      console.log(`   - ${Object.values(row)[0]}`);
    }

    // Write .env files for each service
    console.log('\n▶ Updating .env files across all 6 services with MySQL config...');
    const services = [
      { name: 'accounts', port: 8080, db: 'nivaaran_accounts' },
      { name: 'directory', port: 8081, db: 'nivaaran_directory' },
      { name: 'complaints', port: 8082, db: 'nivaaran_complaints' },
      { name: 'resolution', port: 8083, db: 'nivaaran_resolution' },
      { name: 'notifications', port: 8084, db: 'nivaaran_notifications' },
      { name: 'analytics', port: 8085, db: 'nivaaran_analytics' }
    ];

    for (const svc of services) {
      const envPath = path.join(__dirname, '..', 'services', svc.name, '.env');
      const envContent = [
        `# ${svc.name.toUpperCase()} Service Environment`,
        `PORT=${svc.port}`,
        `JWT_SECRET=nivaaran-dev-secret`,
        `MYSQL_HOST=${host}`,
        `MYSQL_PORT=${port}`,
        `MYSQL_USER=${user}`,
        `MYSQL_PASSWORD=${password}`,
        `MYSQL_DATABASE=${svc.db}`
      ].join('\n') + '\n';

      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`   ✔ Wrote services/${svc.name}/.env`);
    }

    console.log('\n' + '='.repeat(65));
    console.log('✅ MYSQL SETUP COMPLETE FOR ALL SERVICES!');
    console.log('='.repeat(65) + '\n');
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

run();
