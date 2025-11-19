#!/usr/bin/env node

/**
 * Lightweight Babel configuration test
 * Tests if babel-plugin-module-resolver can be loaded and used
 * without doing a full build simulation
 */

console.log('🧪 Testing Babel Configuration...\n');

// Set production environment
process.env.EAS_BUILD_PROFILE = 'production';
process.env.NODE_ENV = 'production';
process.env.CI = 'true';

try {
  // Test 1: Verify plugin exists
  console.log('1️⃣  Verifying babel-plugin-module-resolver exists...');
  const pluginPath = require.resolve('babel-plugin-module-resolver');
  console.log(`   ✅ Found at: ${pluginPath}\n`);

  // Test 2: Load babel config
  console.log('2️⃣  Loading babel.config.js...');
  const babelConfig = require('../babel.config.js');
  const api = {
    cache: () => true
  };
  const config = babelConfig(api);
  console.log(`   ✅ Config loaded successfully\n`);

  // Test 3: Verify plugins array
  console.log('3️⃣  Verifying plugins configuration...');
  if (!config.plugins || !Array.isArray(config.plugins)) {
    throw new Error('Plugins must be an array');
  }
  console.log(`   ✅ Found ${config.plugins.length} plugin(s)`);
  
  config.plugins.forEach((plugin, index) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    console.log(`   - Plugin ${index + 1}: ${pluginName}`);
  });
  console.log('');

  // Test 4: Verify module-resolver plugin is present
  console.log('4️⃣  Verifying module-resolver plugin...');
  const hasModuleResolver = config.plugins.some(plugin => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name === 'module-resolver' || name.includes('module-resolver');
  });
  
  if (!hasModuleResolver) {
    throw new Error('module-resolver plugin not found in plugins array');
  }
  console.log('   ✅ module-resolver plugin found\n');

  // Test 5: Try to require the plugin directly
  console.log('5️⃣  Testing direct plugin require...');
  const ModuleResolver = require('babel-plugin-module-resolver');
  console.log('   ✅ Plugin module loaded successfully\n');

  // Test 6: Verify presets
  console.log('6️⃣  Verifying presets...');
  if (!config.presets || !Array.isArray(config.presets)) {
    throw new Error('Presets must be an array');
  }
  console.log(`   ✅ Found ${config.presets.length} preset(s)`);
  config.presets.forEach((preset, index) => {
    const presetName = Array.isArray(preset) ? preset[0] : preset;
    console.log(`   - Preset ${index + 1}: ${presetName}`);
  });
  console.log('');

  console.log('✅ All Babel configuration tests passed!\n');
  console.log('💡 This means babel-plugin-module-resolver should work in EAS build.');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Babel configuration test failed!');
  console.error(`   Error: ${error.message}`);
  if (error.stack) {
    console.error(`   Stack: ${error.stack}`);
  }
  console.error('\n💡 Fix the issue above before submitting EAS build.');
  process.exit(1);
}

