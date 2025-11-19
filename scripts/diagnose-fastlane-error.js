#!/usr/bin/env node

/**
 * Fastlane/Xcode Build Error Diagnostic Script
 * Helps identify common causes of fastlane build failures
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Fastlane/Xcode Build Error Diagnostic');
console.log('========================================\n');

let issuesFound = 0;
let warningsFound = 0;

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
      warningsFound++;
    } else {
      console.log(`${RED}❌${RESET} ${errorMsg}`);
      issuesFound++;
    }
  }
}

// Check 1: New Architecture compatibility
console.log('🏗️  Checking New Architecture Configuration...');
try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.NODE_ENV = 'production';
  const appConfig = require('../app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  
  if (config && config.expo) {
    const newArchEnabled = config.expo.newArchEnabled;
    if (newArchEnabled) {
      console.log(`${YELLOW}⚠️  ${RESET} New Architecture is enabled`);
      console.log('   Some native modules may not support New Architecture yet.');
      console.log('   If build fails, try disabling it temporarily.');
      warningsFound++;
      
      // Check for known incompatible packages
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const potentiallyIncompatible = [
        'react-native-calendars',
        'react-native-chart-kit',
        'react-native-pell-rich-editor',
        'react-native-rich-editor',
        '@dr.pogodin/react-native-fs',
        '@dr.pogodin/react-native-static-server'
      ];
      
      const foundIncompatible = potentiallyIncompatible.filter(pkg => allDeps[pkg]);
      if (foundIncompatible.length > 0) {
        console.log(`${YELLOW}⚠️  ${RESET} Potentially incompatible packages with New Architecture:`);
        foundIncompatible.forEach(pkg => {
          console.log(`   - ${pkg}`);
        });
        warningsFound++;
      }
    }
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check New Architecture: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 2: React Native version compatibility
console.log('📦 Checking React Native Version...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const reactNativeVersion = packageJson.dependencies['react-native'];
  const expoVersion = packageJson.dependencies['expo'];
  
  if (reactNativeVersion && expoVersion) {
    const rnVersion = reactNativeVersion.replace(/[^0-9.]/g, '');
    const expoSDK = expoVersion.replace(/[^0-9.]/g, '').split('.')[0];
    
    console.log(`   React Native: ${reactNativeVersion}`);
    console.log(`   Expo SDK: ${expoVersion}`);
    
    // Check if versions are compatible
    // Expo SDK 54 should use React Native 0.81.x
    if (expoSDK === '54' && !rnVersion.startsWith('0.81')) {
      console.log(`${YELLOW}⚠️  ${RESET} React Native version may not match Expo SDK 54`);
      console.log(`   Expected: ~0.81.x, Found: ${reactNativeVersion}`);
      warningsFound++;
    }
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check versions: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 3: Check for problematic native dependencies
console.log('🔧 Checking Native Dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check for packages that might cause build issues
  const problematicPackages = {
    '@dr.pogodin/react-native-static-server': {
      issue: 'May cause issues in production builds',
      solution: 'Ensure it\'s only used in development'
    },
    'react-native-pell-rich-editor': {
      issue: 'May have New Architecture compatibility issues',
      solution: 'Check if it supports New Architecture'
    },
    'react-native-rich-editor': {
      issue: 'May have New Architecture compatibility issues',
      solution: 'Check if it supports New Architecture'
    }
  };
  
  Object.keys(problematicPackages).forEach(pkg => {
    if (deps[pkg]) {
      const info = problematicPackages[pkg];
      console.log(`${YELLOW}⚠️  ${RESET} ${pkg}: ${info.issue}`);
      console.log(`   Solution: ${info.solution}`);
      warningsFound++;
    }
  });
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check dependencies: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 4: EAS Build Configuration
console.log('⚙️  Checking EAS Build Configuration...');
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  
  if (easConfig.build && easConfig.build.production) {
    const prod = easConfig.build.production;
    
    // Check iOS build image
    if (prod.ios && prod.ios.image) {
      const image = prod.ios.image;
      if (image === 'latest') {
        console.log(`${YELLOW}⚠️  ${RESET} Using 'latest' iOS build image`);
        console.log('   Consider pinning to a specific version for reproducibility');
        warningsFound++;
      } else {
        console.log(`${GREEN}✅${RESET} iOS build image: ${image}`);
      }
    }
    
    // Check build configuration
    if (prod.ios && prod.ios.buildConfiguration) {
      check(prod.ios.buildConfiguration === 'Release',
        `Build configuration: ${prod.ios.buildConfiguration}`,
        `Build configuration should be 'Release' for production`,
        false);
    }
    
    // Check cache
    if (prod.cache && prod.cache.disabled === true) {
      console.log(`${GREEN}✅${RESET} Cache is disabled (good for troubleshooting)`);
    }
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check EAS config: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 5: Check for common build issues in Podfile
console.log('📱 Checking Podfile Configuration...');
const podfilePath = path.join(__dirname, '../ios/Podfile');
if (fs.existsSync(podfilePath)) {
  const podfileContent = fs.readFileSync(podfilePath, 'utf8');
  
  // Check for Release build detection
  check(podfileContent.includes('is_release_build?'),
    'Release build detection function exists',
    'Release build detection may be missing',
    true);
  
  // Check for debug-only pods removal
  check(podfileContent.includes('debug_only_pods') || podfileContent.includes('debug-only'),
    'Debug-only pods removal logic exists',
    'Debug-only pods removal may be missing',
    true);
  
  // Check for IPHONEOS_DEPLOYMENT_TARGET fix
  check(podfileContent.includes('IPHONEOS_DEPLOYMENT_TARGET'),
    'IPHONEOS_DEPLOYMENT_TARGET fix exists',
    'IPHONEOS_DEPLOYMENT_TARGET fix may be missing',
    true);
} else {
  console.log(`${YELLOW}⚠️  ${RESET} Podfile not found (will be generated by prebuild)`);
  warningsFound++;
}
console.log('');

// Summary and recommendations
console.log('========================================');
console.log('📋 Diagnostic Summary\n');

if (issuesFound === 0 && warningsFound === 0) {
  console.log(`${GREEN}✅ No obvious issues found${RESET}`);
  console.log('\n💡 If build still fails, check:');
  console.log('   1. Xcode logs in EAS build dashboard');
  console.log('   2. Code signing and certificates');
  console.log('   3. Memory/resource limits');
  console.log('   4. Specific error messages in build logs');
} else {
  if (issuesFound > 0) {
    console.log(`${RED}❌ Found ${issuesFound} critical issue(s)${RESET}`);
  }
  if (warningsFound > 0) {
    console.log(`${YELLOW}⚠️  Found ${warningsFound} warning(s)${RESET}`);
  }
  
  console.log('\n💡 Recommendations:');
  
  if (warningsFound > 0) {
    console.log('\n1. New Architecture Issues:');
    console.log('   If build fails, try temporarily disabling New Architecture:');
    console.log('   - Set newArchEnabled: false in app.config.js');
    console.log('   - Commit and rebuild');
    
    console.log('\n2. Check Build Logs:');
    console.log('   - Download Xcode logs from EAS build dashboard');
    console.log('   - Look for specific error messages');
    console.log('   - Check for memory errors, signing errors, or compilation errors');
    
    console.log('\n3. Common Fastlane Errors:');
    console.log('   - Code signing: Check certificates and provisioning profiles');
    console.log('   - Archive: Check for missing files or dependencies');
    console.log('   - Compilation: Check for Swift/Obj-C errors');
  }
}

console.log('\n📚 For more help:');
console.log('   - EAS Build Docs: https://docs.expo.dev/build/introduction/');
console.log('   - Fastlane Docs: https://docs.fastlane.tools/');
console.log('   - Check build logs: https://expo.dev/accounts/j8t/projects/whisperline/builds/');

process.exit(issuesFound > 0 ? 1 : 0);

