#!/usr/bin/env node

/**
 * Verify critical dependencies before EAS build
 * This script ensures babel-plugin-module-resolver is installed
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying critical dependencies...\n');

const criticalDeps = [
  'babel-plugin-module-resolver',
  'babel-plugin-transform-replace-expressions'
];

let allFound = true;

for (const dep of criticalDeps) {
  try {
    const packagePath = require.resolve(dep);
    console.log(`✅ ${dep} found at: ${packagePath}`);
  } catch (e) {
    console.error(`❌ ${dep} NOT FOUND!`);
    console.error(`   Error: ${e.message}`);
    allFound = false;
  }
}

// Also verify package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('\n📦 Checking package.json...');
for (const dep of criticalDeps) {
  const inDeps = packageJson.dependencies && packageJson.dependencies[dep];
  const inDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
  
  if (inDeps) {
    console.log(`✅ ${dep} in dependencies: ${packageJson.dependencies[dep]}`);
  } else if (inDevDeps) {
    console.log(`⚠️  ${dep} in devDependencies: ${packageJson.devDependencies[dep]}`);
    console.log(`   ⚠️  WARNING: This should be in dependencies for production builds!`);
  } else {
    console.error(`❌ ${dep} NOT FOUND in package.json!`);
    allFound = false;
  }
}

if (!allFound) {
  console.error('\n❌ Dependency verification failed!');
  console.error('Please run: npm install');
  process.exit(1);
}

console.log('\n✅ All critical dependencies verified!');
process.exit(0);

