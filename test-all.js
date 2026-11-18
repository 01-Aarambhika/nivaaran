/**
 * test-all.js - Test runner for all 6 Nivaaran microservices
 */

const { spawnSync } = require('child_process');
const path = require('path');

const services = ['accounts', 'directory', 'complaints', 'resolution', 'notifications', 'analytics'];

console.log('='.repeat(60));
console.log(' NIVAARAN MICROSERVICES TEST SUITE RUNNER');
console.log('='.repeat(60));

let totalPassed = 0;

for (const svc of services) {
  console.log(`\n▶ Running tests for ${svc.toUpperCase()} service...`);
  const svcDir = path.join(__dirname, 'Nivaaran-Microservices', 'services', svc);
  const testFile = path.join('tests', `${svc}.test.js`);
  
  const result = spawnSync('node', ['--test', testFile], {
    cwd: svcDir,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    console.error(`\n❌ Tests failed for ${svc} service.`);
    process.exit(1);
  }
  totalPassed++;
}

console.log('\n' + '='.repeat(60));
console.log(`✅ ALL ${totalPassed} SERVICES PASSED ALL INTEGRATION TESTS SUCCESSFULLY!`);
console.log('='.repeat(60) + '\n');
