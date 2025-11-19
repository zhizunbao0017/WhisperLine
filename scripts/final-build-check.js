#!/usr/bin/env node

/**
 * Final Build Check - Comprehensive verification before EAS build
 * Ensures all critical configurations are correct
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Final Build Check - Comprehensive Verification');
console.log('==================================================\n');

let allPassed = true;
const errors = [];
const warnings = [];

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function check(condition, successMsg, errorMsg, isWarning = false) {
  if (condition) {
    console.log(`${GREEN}✅${RESET} ${successMsg}`);
  } else {
    if (isWarning) {
      console.log(`${YELLOW}⚠️  ${RESET} ${errorMsg}`);
      warnings.push(errorMsg);
    } else {
      console.log(`${RED}❌${RESET} ${errorMsg}`);
      errors.push(errorMsg);
      allPassed = false;
    }
  }
}

// Check 1: New Architecture
console.log('1️⃣  Checking New Architecture Configuration...');
try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.NODE_ENV = 'production';
  const appConfig = require('../app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
  
  check(config.expo.newArchEnabled === false,
    'app.config.js: New Architecture is DISABLED',
    'app.config.js: New Architecture is ENABLED (should be false)');
  
  check(appJson.expo.newArchEnabled === false,
    'app.json: New Architecture is DISABLED',
    'app.json: New Architecture is ENABLED (should be false)');
  
  check(config.expo.newArchEnabled === appJson.expo.newArchEnabled,
    'New Architecture config is consistent between app.config.js and app.json',
    'New Architecture config mismatch between app.config.js and app.json');
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check New Architecture: ${e.message}`);
  errors.push(`New Architecture check failed: ${e.message}`);
  allPassed = false;
}
console.log('');

// Check 2: Babel Configuration
console.log('2️⃣  Checking Babel Configuration...');
try {
  const babelConfig = require('../babel.config.js');
  const api = { cache: () => true };
  const config = babelConfig(api);
  
  check(config.plugins && config.plugins.length > 0,
    'Babel plugins configured',
    'Babel plugins not configured');
  
  const hasModuleResolver = config.plugins.some(p => {
    const name = Array.isArray(p) ? p[0] : p;
    return name === 'module-resolver' || name.includes('module-resolver');
  });
  
  check(hasModuleResolver,
    'module-resolver plugin is configured',
    'module-resolver plugin is missing');
  
  // Check @ alias
  const moduleResolver = config.plugins.find(p => {
    const name = Array.isArray(p) ? p[0] : p;
    return name === 'module-resolver' || name.includes('module-resolver');
  });
  
  if (moduleResolver && Array.isArray(moduleResolver)) {
    const options = moduleResolver[1];
    check(options.alias && options.alias['@'],
      '@ alias is configured',
      '@ alias is missing');
  }
  
  // Verify plugin exists
  try {
    require.resolve('babel-plugin-module-resolver');
    console.log(`${GREEN}✅${RESET} babel-plugin-module-resolver is installed`);
  } catch (e) {
    console.log(`${RED}❌${RESET} babel-plugin-module-resolver is NOT installed`);
    errors.push('babel-plugin-module-resolver is not installed');
    allPassed = false;
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check Babel config: ${e.message}`);
  errors.push(`Babel config check failed: ${e.message}`);
  allPassed = false;
}
console.log('');

// Check 3: Dependencies
console.log('3️⃣  Checking Critical Dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  
  check(packageJson.dependencies && packageJson.dependencies['babel-plugin-module-resolver'],
    'babel-plugin-module-resolver is in dependencies',
    'babel-plugin-module-resolver is NOT in dependencies (should be in dependencies, not devDependencies)');
  
  check(packageJson.dependencies && packageJson.dependencies['babel-plugin-transform-replace-expressions'],
    'babel-plugin-transform-replace-expressions is in dependencies',
    'babel-plugin-transform-replace-expressions is NOT in dependencies');
  
  // Check expo-dev-client is NOT in dependencies
  check(!packageJson.dependencies || !packageJson.dependencies['expo-dev-client'],
    'expo-dev-client is NOT in dependencies (correct)',
    'expo-dev-client is in dependencies (should be in devDependencies only)');
  
  // Check @types/react-native is NOT installed
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  check(!allDeps['@types/react-native'],
    '@types/react-native is NOT installed (correct)',
    '@types/react-native is installed (should be removed)');
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check dependencies: ${e.message}`);
  errors.push(`Dependencies check failed: ${e.message}`);
  allPassed = false;
}
console.log('');

// Check 4: Icon File
console.log('4️⃣  Checking Icon File...');
const iconPath = path.join(__dirname, '../assets/images/icon.png');
check(fs.existsSync(iconPath),
  'icon.png file exists',
  'icon.png file is MISSING');

if (fs.existsSync(iconPath)) {
  const stats = fs.statSync(iconPath);
  check(stats.size > 0,
    `icon.png file size: ${(stats.size / 1024).toFixed(1)}KB`,
    'icon.png file is empty');
  
  // Check if in git
  const { execSync } = require('child_process');
  try {
    execSync(`git ls-files ${iconPath}`, { stdio: 'pipe' });
    console.log(`${GREEN}✅${RESET} icon.png is tracked in git`);
  } catch (e) {
    console.log(`${RED}❌${RESET} icon.png is NOT tracked in git`);
    errors.push('icon.png is not tracked in git');
    allPassed = false;
  }
}
console.log('');

// Check 5: EAS Configuration
console.log('5️⃣  Checking EAS Build Configuration...');
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  
  if (easConfig.build && easConfig.build.production) {
    const prod = easConfig.build.production;
    
    check(prod.ios && prod.ios.buildConfiguration === 'Release',
      `Build configuration: ${prod.ios.buildConfiguration}`,
      `Build configuration should be 'Release', found: ${prod.ios?.buildConfiguration}`);
    
    check(prod.ios && prod.ios.image && prod.ios.image !== 'latest',
      `iOS build image: ${prod.ios.image} (fixed version)`,
      `iOS build image is 'latest' (should use fixed version)`);
    
    check(prod.cache && prod.cache.disabled === true,
      'Cache is disabled',
      'Cache is enabled (should be disabled for troubleshooting)');
    
    check(prod.env && prod.env.NO_FLIPPER === '1',
      'Flipper is disabled (NO_FLIPPER=1)',
      'Flipper is NOT disabled');
    
    check(prod.env && prod.env.NODE_ENV === 'production',
      'NODE_ENV is set to production',
      'NODE_ENV is NOT set to production');
    
    // Check prebuildCommand is removed
    check(!prod.prebuildCommand,
      'prebuildCommand is removed (correct)',
      'prebuildCommand is still present (should be removed)');
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check EAS config: ${e.message}`);
  errors.push(`EAS config check failed: ${e.message}`);
  allPassed = false;
}
console.log('');

// Check 6: App Configuration
console.log('6️⃣  Checking App Configuration...');
try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.NODE_ENV = 'production';
  const appConfig = require('../app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  
  check(config.expo.ios && config.expo.ios.bundleIdentifier,
    `Bundle ID: ${config.expo.ios.bundleIdentifier}`,
    'Bundle ID is missing');
  
  check(config.expo.ios && config.expo.ios.buildNumber,
    `Build number: ${config.expo.ios.buildNumber}`,
    'Build number is missing');
  
  check(config.expo.icon,
    `Icon path: ${config.expo.icon}`,
    'Icon path is missing');
  
  // Check expo-dev-client is conditionally excluded
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                       process.env.NODE_ENV === 'production';
  const hasDevClient = config.expo.plugins && config.expo.plugins.includes('expo-dev-client');
  check(!hasDevClient || !isProduction,
    'expo-dev-client is excluded in production',
    'expo-dev-client is included in production (should be excluded)');
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check app config: ${e.message}`);
  errors.push(`App config check failed: ${e.message}`);
  allPassed = false;
}
console.log('');

// Check 7: Git Status
console.log('7️⃣  Checking Git Status...');
try {
  const { execSync } = require('child_process');
  const gitStatus = execSync('git status --short', { encoding: 'utf8', cwd: path.join(__dirname, '..') });
  
  if (gitStatus.trim()) {
    console.log(`${YELLOW}⚠️  ${RESET} There are uncommitted changes:`);
    console.log(gitStatus);
    warnings.push('Uncommitted changes detected');
  } else {
    console.log(`${GREEN}✅${RESET} Working tree is clean (all changes committed)`);
  }
} catch (e) {
  console.log(`${YELLOW}⚠️  ${RESET} Could not check git status: ${e.message}`);
  warnings.push('Could not check git status');
}
console.log('');

// Check 8: Metro Configuration
console.log('8️⃣  Checking Metro Configuration...');
try {
  const metroConfig = require('../metro.config.js');
  check(metroConfig.resolver && metroConfig.resolver.alias && metroConfig.resolver.alias['@'],
    '@ alias is configured in Metro',
    '@ alias is NOT configured in Metro');
} catch (e) {
  console.log(`${YELLOW}⚠️  ${RESET} Could not check Metro config: ${e.message}`);
  warnings.push('Could not check Metro config');
}
console.log('');

// Final Summary
console.log('==================================================');
console.log('📋 Final Check Summary\n');

if (allPassed && errors.length === 0) {
  console.log(`${GREEN}✅ ALL CHECKS PASSED!${RESET}`);
  console.log('\n🎉 Your project is ready for EAS build!');
  console.log('\nNext steps:');
  console.log('1. Commit any remaining changes:');
  console.log('   git add .');
  console.log('   git commit -m "Final build preparation"');
  console.log('   git push');
  console.log('\n2. Start EAS build:');
  console.log('   eas build --platform ios --profile production');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`${RED}❌ Found ${errors.length} critical error(s):${RESET}`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n${YELLOW}⚠️  Found ${warnings.length} warning(s):${RESET}`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }
  
  console.log('\n💡 Please fix the errors above before building.');
  process.exit(1);
}

