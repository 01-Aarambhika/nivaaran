/**
 * run-fullstack.js - Single Command Full-Stack Runner for Nivaaran
 * Runs all 6 Backend Microservices + React Vite Frontend concurrently.
 */

const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Accounts', dir: path.join(__dirname, 'Nivaaran-Microservices', 'services', 'accounts'), port: 8080 },
  { name: 'Directory', dir: path.join(__dirname, 'Nivaaran-Microservices', 'services', 'directory'), port: 8081 },
  { name: 'Complaints', dir: path.join(__dirname, 'Nivaaran-Microservices', 'services', 'complaints'), port: 8082 },
  { name: 'Resolution', dir: path.join(__dirname, 'Nivaaran-Microservices', 'services', 'resolution'), port: 8083 },
  { name: 'Notifications', dir: path.join(__dirname, 'Nivaaran-Microservices', 'services', 'notifications'), port: 8084 },
  { name: 'Analytics', dir: path.join(__dirname, 'Nivaaran-Microservices', 'services', 'analytics'), port: 8085 },
];

const children = [];

function killProcessTree(pid) {
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', pid, '/f', '/t'], { stdio: 'ignore' });
    } catch (e) {}
  } else {
    try {
      process.kill(-pid, 'SIGINT');
    } catch (e) {}
  }
}

function cleanup() {
  console.log('\n🛑 Stopping all Nivaaran services...');
  for (const child of children) {
    if (child && child.pid) {
      killProcessTree(child.pid);
    }
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('='.repeat(70));
console.log('🚀 NIVAARAN FULL STACK RUNNER');
console.log('='.repeat(70));
console.log('Starting 6 Microservices and React Frontend...\n');

// 1. Start all 6 backend services
for (const svc of services) {
  const p = spawn('node', ['--env-file=.env', 'src/app.js'], {
    cwd: svc.dir,
    shell: true,
    env: { ...process.env, PORT: svc.port }
  });

  p.stdout.on('data', d => {
    const lines = d.toString().trim().split('\n');
    lines.forEach(l => console.log(`[${svc.name.padEnd(13)}] ${l}`));
  });

  p.stderr.on('data', d => {
    const lines = d.toString().trim().split('\n');
    lines.forEach(l => console.error(`[${svc.name.padEnd(13)} ERR] ${l}`));
  });

  children.push(p);
}

// 2. Start Vite Client
setTimeout(() => {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const client = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    shell: true,
    env: { ...process.env }
  });

  client.stdout.on('data', d => {
    const lines = d.toString().trim().split('\n');
    lines.forEach(l => console.log(`[Client       ] ${l}`));
  });

  client.stderr.on('data', d => {
    const lines = d.toString().trim().split('\n');
    lines.forEach(l => console.error(`[Client ERR   ] ${l}`));
  });

  children.push(client);

  setTimeout(() => {
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL SERVICES ARE RUNNING:');
    console.log('   🌐 Frontend Client:    http://localhost:5173');
    console.log('   🔑 Accounts API:       http://localhost:8080');
    console.log('   📁 Directory API:      http://localhost:8081');
    console.log('   📝 Complaints API:     http://localhost:8082');
    console.log('   🛠️ Resolution API:     http://localhost:8083');
    console.log('   🔔 Notifications API:  http://localhost:8084');
    console.log('   📊 Analytics API:      http://localhost:8085');
    console.log('='.repeat(70));
    console.log('👉 Press Ctrl + C to stop all services anytime.\n');
  }, 4000);

}, 1500);
