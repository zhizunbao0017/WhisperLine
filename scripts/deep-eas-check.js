#!/usr/bin/env node

/**
 * Deep EAS Build Rules Check
 * Comprehensive verification of EAS build configuration and rules compliance
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Deep EAS Build Rules Check');
console.log('==============================\n');

let issuesFound = 0;
let warningsFound = 0;
const errors = [];
const warnings = [];

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function check(condition, successMsg, errorMsg, isWarning = false) {
  if (condition) {
    console.log(`${GREEN}✅${RESET} ${successMsg}`);
  } else {
    if (isWarning) {
      console.log(`${YELLOW}⚠️  ${RESET} ${errorMsg}`);
      warnings.push(errorMsg);
      warningsFound++;
    } else {
      console.log(`${RED}❌${RESET} ${errorMsg}`);
      errors.push(errorMsg);
      issuesFound++;
    }
  }
}

// Check 1: Environment Variables Consistency
console.log(`${BLUE}1️⃣  Checking Environment Variables Consistency...${RESET}`);
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  const appConfigCode = fs.readFileSync(path.join(__dirname, '../app.config.js'), 'utf8');
  
  if (easConfig.build && easConfig.build.production && easConfig.build.production.env) {
    const easEnv = easConfig.build.production.env;
    
    // Check for conflicting environment variables
    const envVars = {
      'NODE_ENV': easEnv.NODE_ENV,
      'EXPO_METRO_NO_SOURCE_MAPS': easEnv.EXPO_METRO_NO_SOURCE_MAPS,
      'GENERATE_SOURCEMAP': easEnv.GENERATE_SOURCEMAP,
      'EXPO_DEBUG': easEnv.EXPO_DEBUG,
      'NO_FLIPPER': easEnv.NO_FLIPPER,
      'CI': easEnv.CI,
    };
    
    console.log('   EAS env variables:');
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`     ${key}=${value}`);
    });
    
    // Check app.config.js also sets these
    const configSetsExpoDebug = appConfigCode.includes('EXPO_DEBUG') || appConfigCode.includes('process.env.EXPO_DEBUG');
    const configSetsSourceMaps = appConfigCode.includes('EXPO_METRO_NO_SOURCE_MAPS') || appConfigCode.includes('GENERATE_SOURCEMAP');
    
    if (configSetsExpoDebug && easEnv.EXPO_DEBUG) {
      console.log(`${YELLOW}⚠️  ${RESET} EXPO_DEBUG is set in both eas.json and app.config.js`);
      console.log('   Note: eas.json takes precedence, but duplication may cause confusion');
      warningsFound++;
    }
    
    // Verify critical values
    check(easEnv.NODE_ENV === 'production',
      'NODE_ENV is set to production',
      'NODE_ENV should be "production" for production builds');
    
    check(easEnv.NO_FLIPPER === '1',
      'NO_FLIPPER is set to 1',
      'NO_FLIPPER should be "1" to disable Flipper');
    
    check(easEnv.CI === 'true',
      'CI is set to true',
      'CI should be "true" for EAS builds');
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check environment variables: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 2: SDK Version Compatibility
console.log(`${BLUE}2️⃣  Checking SDK Version Compatibility...${RESET}`);
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const expoVersion = packageJson.dependencies?.expo;
  const reactNativeVersion = packageJson.dependencies?.['react-native'];
  
  if (expoVersion && reactNativeVersion) {
    const expoSDK = expoVersion.match(/~?(\d+)\./)?.[1];
    const rnVersion = reactNativeVersion.replace(/[^0-9.]/g, '');
    
    console.log(`   Expo SDK: ${expoVersion} (SDK ${expoSDK})`);
    console.log(`   React Native: ${reactNativeVersion}`);
    
    // Check if SDK matches build image
    const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
    const buildImage = easConfig.build?.production?.ios?.image;
    
    if (buildImage && buildImage.startsWith('sdk-')) {
      const imageSDK = buildImage.replace('sdk-', '');
      check(imageSDK === expoSDK,
        `Build image SDK (${imageSDK}) matches Expo SDK (${expoSDK})`,
        `Build image SDK (${imageSDK}) does NOT match Expo SDK (${expoSDK})`);
    }
    
    // Check React Native version compatibility
    // Expo SDK 54 should use React Native 0.81.x
    if (expoSDK === '54') {
      check(rnVersion.startsWith('0.81'),
        `React Native ${reactNativeVersion} is compatible with Expo SDK 54`,
        `React Native ${reactNativeVersion} may not be compatible with Expo SDK 54 (expected 0.81.x)`);
    }
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check SDK compatibility: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 3: Dependency Placement (EAS Rule)
console.log(`${BLUE}3️⃣  Checking Dependency Placement (EAS Rule)...${RESET}`);
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  
  // EAS Rule: Production builds only install dependencies, not devDependencies
  const criticalForBuild = [
    'babel-plugin-module-resolver',
    'babel-plugin-transform-replace-expressions'
  ];
  
  criticalForBuild.forEach(dep => {
    const inDeps = packageJson.dependencies && packageJson.dependencies[dep];
    const inDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
    
    check(inDeps && !inDevDeps,
      `${dep} is in dependencies (correct for production builds)`,
      `${dep} should be in dependencies, not devDependencies (EAS production builds don't install devDependencies)`);
  });
  
  // Check expo-dev-client is NOT in dependencies
  check(!packageJson.dependencies || !packageJson.dependencies['expo-dev-client'],
    'expo-dev-client is NOT in dependencies (correct)',
    'expo-dev-client should NOT be in dependencies (EAS production builds will fail)');
  
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check dependency placement: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 4: App Config Consistency
console.log(`${BLUE}4️⃣  Checking App Config Consistency...${RESET}`);
try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.NODE_ENV = 'production';
  
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
  const appConfig = require('../app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  
  // Check critical fields match
  const criticalFields = ['name', 'slug', 'version', 'newArchEnabled'];
  
  criticalFields.forEach(field => {
    const jsonValue = appJson.expo?.[field];
    const configValue = config.expo?.[field];
    
    if (field === 'newArchEnabled') {
      check(jsonValue === false && configValue === false,
        `${field} is consistently false in both files`,
        `${field} mismatch: app.json=${jsonValue}, app.config.js=${configValue}`);
    } else if (jsonValue && configValue) {
      check(jsonValue === configValue,
        `${field} matches: "${jsonValue}"`,
        `${field} mismatch: app.json="${jsonValue}", app.config.js="${configValue}"`);
    }
  });
  
  // Check plugins consistency
  const jsonPlugins = appJson.expo?.plugins || [];
  const configPlugins = config.expo?.plugins || [];
  
  // In production, expo-dev-client should be excluded
  const hasDevClientInConfig = configPlugins.includes('expo-dev-client');
  check(!hasDevClientInConfig,
    'expo-dev-client is excluded in production config',
    'expo-dev-client is included in production config (should be excluded)');
  
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check app config: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 5: EAS Build Image Validation
console.log(`${BLUE}5️⃣  Checking EAS Build Image...${RESET}`);
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  const buildImage = easConfig.build?.production?.ios?.image;
  
  const validImages = [
    'auto', 'default', 'stable', 'latest',
    'sdk-54', 'sdk-53', 'sdk-52', 'sdk-51', 'sdk-50', 'sdk-49',
    'macos-ventura-13.6-xcode-15.0',
    'macos-ventura-13.6-xcode-15.1',
    'macos-ventura-13.6-xcode-15.2',
    'macos-sonoma-14.4-xcode-15.3',
    'macos-sonoma-14.5-xcode-15.4',
    'macos-sonoma-14.6-xcode-16.0',
    'macos-sonoma-14.6-xcode-16.1',
    'macos-sequoia-15.3-xcode-16.2',
    'macos-sequoia-15.4-xcode-16.3',
    'macos-sequoia-15.5-xcode-16.4',
    'macos-sequoia-15.5-xcode-26.0',
    'macos-sequoia-15.6-xcode-16.4',
    'macos-sequoia-15.6-xcode-26.0',
    'macos-sequoia-15.6-xcode-26.1'
  ];
  
  check(buildImage && validImages.includes(buildImage),
    `Build image "${buildImage}" is valid`,
    `Build image "${buildImage}" is NOT valid. Valid options: ${validImages.slice(0, 5).join(', ')}...`);
  
  if (buildImage === 'latest') {
    console.log(`${YELLOW}⚠️  ${RESET} Using 'latest' image - consider using 'sdk-54' for stability`);
    warningsFound++;
  }
  
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check build image: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 6: Node Version Compatibility
console.log(`${BLUE}6️⃣  Checking Node Version Compatibility...${RESET}`);
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  const nodeVersion = easConfig.build?.production?.node;
  
  if (nodeVersion) {
    console.log(`   Node version: ${nodeVersion}`);
    
    // Check if version is reasonable
    const majorVersion = parseInt(nodeVersion.split('.')[0]);
    check(majorVersion >= 18 && majorVersion <= 20,
      `Node ${nodeVersion} is within supported range (18-20)`,
      `Node ${nodeVersion} may not be supported (recommended: 18.x or 20.x)`);
  } else {
    console.log(`${YELLOW}⚠️  ${RESET} Node version not specified (EAS will use default)`);
    warningsFound++;
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check Node version: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 7: Cache Configuration
console.log(`${BLUE}7️⃣  Checking Cache Configuration...${RESET}`);
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  const cacheConfig = easConfig.build?.production?.cache;
  
  if (cacheConfig) {
    if (cacheConfig.disabled === true) {
      console.log(`${GREEN}✅${RESET} Cache is disabled (good for troubleshooting)`);
    } else {
      console.log(`${YELLOW}⚠️  ${RESET} Cache is enabled`);
      console.log('   Note: Disabling cache can help troubleshoot build issues');
      warningsFound++;
    }
  } else {
    console.log(`${YELLOW}⚠️  ${RESET} Cache configuration not specified (will use default)`);
    warningsFound++;
  }
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check cache config: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 8: Build Configuration
console.log(`${BLUE}8️⃣  Checking Build Configuration...${RESET}`);
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8'));
  const buildConfig = easConfig.build?.production?.ios?.buildConfiguration;
  
  check(buildConfig === 'Release',
    `Build configuration: ${buildConfig}`,
    `Build configuration should be "Release" for production, found: ${buildConfig}`);
  
  check(easConfig.build?.production?.autoIncrement === true,
    'autoIncrement is enabled',
    'autoIncrement should be enabled for production builds');
  
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check build config: ${e.message}`);
  issuesFound++;
}
console.log('');

// Check 9: File Assets
console.log(`${BLUE}9️⃣  Checking File Assets...${RESET}`);
const requiredAssets = [
  'assets/images/icon.png',
  'assets/images/android-icon-foreground.png',
  'assets/images/android-icon-background.png',
  'assets/images/favicon.png'
];

requiredAssets.forEach(asset => {
  const assetPath = path.join(__dirname, '..', asset);
  check(fs.existsSync(assetPath),
    `${asset} exists`,
    `${asset} is MISSING`);
  
  if (fs.existsSync(assetPath)) {
    // Check if in git
    const { execSync } = require('child_process');
    try {
      execSync(`git ls-files ${asset}`, { stdio: 'pipe', cwd: path.join(__dirname, '..') });
      console.log(`   ${GREEN}✅${RESET} ${asset} is tracked in git`);
    } catch (e) {
      console.log(`   ${RED}❌${RESET} ${asset} is NOT tracked in git`);
      errors.push(`${asset} is not tracked in git`);
      issuesFound++;
    }
  }
});
console.log('');

// Check 10: Metro and Babel Config Consistency
console.log(`${BLUE}🔟 Checking Metro and Babel Config Consistency...${RESET}`);
try {
  const babelConfig = require('../babel.config.js');
  const metroConfig = require('../metro.config.js');
  
  // Check @ alias in both
  const babelApi = { cache: () => true };
  const babelResolved = babelConfig(babelApi);
  const moduleResolver = babelResolved.plugins.find(p => {
    const name = Array.isArray(p) ? p[0] : p;
    return name === 'module-resolver' || name.includes('module-resolver');
  });
  
  const hasBabelAlias = moduleResolver && Array.isArray(moduleResolver) && moduleResolver[1]?.alias?.['@'];
  const hasMetroAlias = metroConfig.resolver && metroConfig.resolver.alias && metroConfig.resolver.alias['@'];
  
  check(hasBabelAlias && hasMetroAlias,
    '@ alias is configured in both Babel and Metro',
    '@ alias should be configured in both Babel and Metro for consistency');
  
} catch (e) {
  console.log(`${RED}❌${RESET} Failed to check Metro/Babel config: ${e.message}`);
  issuesFound++;
}
console.log('');

// Final Summary
console.log('==============================');
console.log('📋 Deep Check Summary\n');

if (issuesFound === 0 && warningsFound === 0) {
  console.log(`${GREEN}✅ PERFECT! All checks passed with no issues or warnings!${RESET}`);
  console.log('\n🎉 Your project is fully compliant with EAS build rules!');
} else {
  if (issuesFound > 0) {
    console.log(`${RED}❌ Found ${issuesFound} critical issue(s):${RESET}`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (warningsFound > 0) {
    console.log(`\n${YELLOW}⚠️  Found ${warningsFound} warning(s):${RESET}`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
    console.log('\n💡 Warnings are not blocking but should be reviewed.');
  }
}

console.log('\n📚 EAS Build Rules Summary:');
console.log('   1. Production builds only install dependencies (not devDependencies)');
console.log('   2. Build image must match SDK version or use valid image name');
console.log('   3. Environment variables in eas.json take precedence');
console.log('   4. New Architecture must be explicitly enabled/disabled');
console.log('   5. All assets must be tracked in git');

if (issuesFound === 0) {
  console.log('\n✅ Ready for EAS build!');
  process.exit(0);
} else {
  console.log('\n❌ Please fix the issues above before building.');
  process.exit(1);
}

