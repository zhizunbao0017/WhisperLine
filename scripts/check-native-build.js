#!/usr/bin/env node

/**
 * Native Build Pre-Check Script
 * Checks for common iOS native code compilation issues before EAS build
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Native Build Pre-Check');
console.log('========================\n');

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

// Check 1: app.config.js iOS configuration
console.log('📱 Checking iOS Configuration...');
try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.NODE_ENV = 'production';
  const appConfig = require('../app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  
  if (config && config.expo && config.expo.ios) {
    const ios = config.expo.ios;
    
    check(ios.bundleIdentifier, 
      `Bundle ID: ${ios.bundleIdentifier}`,
      'Bundle identifier not set in app.config.js');
    
    check(ios.buildNumber, 
      `Build number: ${ios.buildNumber}`,
      'Build number not set');
    
    check(ios.infoPlist, 
      'Info.plist configuration exists',
      'Info.plist configuration missing');
    
    if (ios.infoPlist) {
      const requiredPermissions = [
        'NSPhotoLibraryUsageDescription',
        'NSCameraUsageDescription',
        'NSLocationWhenInUseUsageDescription'
      ];
      
      requiredPermissions.forEach(permission => {
        check(ios.infoPlist[permission], 
          `${permission} is set`,
          `${permission} is missing (may cause App Store rejection)`,
          true);
      });
    }
    
    check(ios.infoPlist?.ITSAppUsesNonExemptEncryption !== undefined,
      'ITSAppUsesNonExemptEncryption is set',
      'ITSAppUsesNonExemptEncryption not set (may cause App Store issues)',
      true);
  } else {
    console.log(`${RED}❌${RESET} iOS configuration not found in app.config.js`);
    issuesFound++;
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to load app.config.js: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 2: Check for newArchEnabled compatibility
console.log('🏗️  Checking Architecture Configuration...');
try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.NODE_ENV = 'production';
  const appConfig = require('../app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  
  if (config && config.expo) {
    const newArchEnabled = config.expo.newArchEnabled;
    check(newArchEnabled !== undefined,
      `New Architecture: ${newArchEnabled ? 'Enabled' : 'Disabled'}`,
      'newArchEnabled not explicitly set',
      true);
    
    if (newArchEnabled) {
      console.log(`${YELLOW}⚠️  ${RESET} New Architecture is enabled. Ensure all native modules support it.`);
      warningsFound++;
    }
  }
} catch (e) {
  // Already handled above
}
console.log('');

// Check 3: Check for problematic native dependencies
console.log('📦 Checking Native Dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check for known problematic packages
  const problematicPackages = {
    'expo-dev-client': {
      check: () => {
        // expo-dev-client should not be in dependencies for production
        if (packageJson.dependencies && packageJson.dependencies['expo-dev-client']) {
          return false;
        }
        return true;
      },
      message: 'expo-dev-client should not be in dependencies (only devDependencies)',
      isWarning: true
    }
  };
  
  Object.keys(problematicPackages).forEach(pkg => {
    if (deps[pkg]) {
      const checkResult = problematicPackages[pkg].check();
      check(checkResult,
        `${pkg} is correctly configured`,
        problematicPackages[pkg].message,
        problematicPackages[pkg].isWarning);
    }
  });
  
  // Check for React Native version compatibility
  const reactNativeVersion = deps['react-native'];
  if (reactNativeVersion) {
    const version = reactNativeVersion.replace(/[^0-9.]/g, '');
    const majorVersion = parseInt(version.split('.')[0]);
    const minorVersion = parseInt(version.split('.')[1]);
    
    check(majorVersion === 0 && minorVersion >= 73,
      `React Native version: ${reactNativeVersion}`,
      `React Native version ${reactNativeVersion} may have compatibility issues`,
      true);
  }
  
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check dependencies: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 4: Check for Swift/Bridging Header issues
console.log('🔧 Checking Native Code Files...');
const iosDir = path.join(__dirname, '../ios');
if (fs.existsSync(iosDir)) {
  const bridgingHeader = path.join(iosDir, 'WhisperLine/WhisperLine-Bridging-Header.h');
  check(fs.existsSync(bridgingHeader),
    'Bridging header exists',
    'Bridging header not found (may cause Swift/Obj-C issues)',
    true);
  
  const appDelegate = path.join(iosDir, 'WhisperLine/AppDelegate.swift');
  check(fs.existsSync(appDelegate),
    'AppDelegate.swift exists',
    'AppDelegate.swift not found',
    true);
  
  // Check Podfile exists
  const podfile = path.join(iosDir, 'Podfile');
  check(fs.existsSync(podfile),
    'Podfile exists',
    'Podfile not found',
    true);
  
  // Check for Podfile.lock (indicates pods were installed)
  const podfileLock = path.join(iosDir, 'Podfile.lock');
  if (fs.existsSync(podfile)) {
    check(fs.existsSync(podfileLock),
      'Podfile.lock exists (pods installed)',
      'Podfile.lock not found (run pod install)',
      true);
  }
} else {
  console.log(`${YELLOW}⚠️  ${RESET} ios/ directory not found (will be generated by EAS prebuild)`);
  warningsFound++;
}
console.log('');

// Check 5: Check EAS build configuration
console.log('⚙️  Checking EAS Build Configuration...');
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  
  if (easConfig.build && easConfig.build.production) {
    const prod = easConfig.build.production;
    
    // Check iOS configuration
    if (prod.ios) {
      check(prod.ios.image,
        `iOS build image: ${prod.ios.image}`,
        'iOS build image not specified');
      
      check(prod.ios.buildConfiguration,
        `Build configuration: ${prod.ios.buildConfiguration}`,
        'Build configuration not specified');
    }
    
    // Check environment variables
    if (prod.env) {
      check(prod.env.NODE_ENV === 'production',
        'NODE_ENV is set to production',
        'NODE_ENV not set to production',
        true);
      
      check(prod.env.NO_FLIPPER === '1',
        'Flipper is disabled (NO_FLIPPER=1)',
        'Flipper may cause build issues (set NO_FLIPPER=1)',
        true);
    }
    
    // Check cache configuration
    if (prod.cache) {
      if (prod.cache.disabled === true) {
        console.log(`${GREEN}✅${RESET} Cache is disabled (good for troubleshooting)`);
      } else {
        console.log(`${YELLOW}⚠️  ${RESET} Cache is enabled (may use stale dependencies)`);
        warningsFound++;
      }
    }
    
    // Check Node version
    if (prod.node) {
      check(prod.node,
        `Node version: ${prod.node}`,
        'Node version not specified',
        true);
    }
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to load eas.json: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 6: Check for common Expo SDK issues
console.log('📚 Checking Expo SDK Configuration...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const expoVersion = packageJson.dependencies?.expo;
  
  if (expoVersion) {
    const version = expoVersion.replace(/[^0-9.]/g, '');
    const majorVersion = parseInt(version.split('.')[0]);
    
    check(majorVersion >= 50,
      `Expo SDK: ${expoVersion}`,
      `Expo SDK ${expoVersion} may have compatibility issues`,
      true);
    
    // Check for expo-router compatibility
    const expoRouterVersion = packageJson.dependencies?.['expo-router'];
    if (expoRouterVersion) {
      check(true,
        `expo-router: ${expoRouterVersion}`,
        '',
        false);
    }
  }
} catch (e) {
  // Already handled
}
console.log('');

// Summary
console.log('========================');
if (issuesFound === 0 && warningsFound === 0) {
  console.log(`${GREEN}✅ All checks passed!${RESET}`);
  console.log('\n💡 Your project is ready for EAS build.');
  process.exit(0);
} else {
  if (issuesFound > 0) {
    console.log(`${RED}❌ Found ${issuesFound} critical issue(s)${RESET}`);
    console.log('   Please fix these issues before submitting EAS build.');
  }
  if (warningsFound > 0) {
    console.log(`${YELLOW}⚠️  Found ${warningsFound} warning(s)${RESET}`);
    console.log('   These may not block the build but should be reviewed.');
  }
  console.log('\n💡 Review the issues above and fix them before building.');
  process.exit(issuesFound > 0 ? 1 : 0);
}

