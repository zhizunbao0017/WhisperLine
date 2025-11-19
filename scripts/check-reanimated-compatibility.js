#!/usr/bin/env node

/**
 * Check react-native-reanimated compatibility with New Architecture
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking react-native-reanimated compatibility...\n');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const reanimatedVersion = packageJson.dependencies?.['react-native-reanimated'];

if (!reanimatedVersion) {
  console.log('❌ react-native-reanimated not found in dependencies');
  process.exit(1);
}

console.log(`Current version: ${reanimatedVersion}`);

// Check version
const majorVersion = parseInt(reanimatedVersion.match(/[~^]?(\d+)\./)?.[1] || '0');

if (majorVersion >= 4) {
  console.log('⚠️  react-native-reanimated 4.x REQUIRES New Architecture');
  console.log('   Solution: Downgrade to 3.x version');
  console.log('   Recommended: ~3.16.1 (compatible with Expo SDK 54)');
  process.exit(1);
} else if (majorVersion === 3) {
  console.log('✅ react-native-reanimated 3.x supports old architecture');
  console.log('   This version should work with New Architecture disabled');
} else {
  console.log('⚠️  Unknown version, please verify compatibility');
}

// Check if RCT_NEW_ARCH_ENABLED is set
const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
const rctNewArch = easConfig.build?.production?.env?.RCT_NEW_ARCH_ENABLED;

if (rctNewArch === '0') {
  console.log('✅ RCT_NEW_ARCH_ENABLED=0 is set in eas.json');
} else {
  console.log('⚠️  RCT_NEW_ARCH_ENABLED not explicitly set to "0"');
  console.log('   Should be set in eas.json env section');
}

console.log('\n✅ Compatibility check complete!');

