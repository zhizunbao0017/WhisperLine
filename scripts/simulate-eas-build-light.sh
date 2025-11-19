#!/bin/bash

# Lightweight EAS Build Simulation
# This version doesn't delete node_modules (faster, but less thorough)
# Use simulate-eas-build.sh for a complete simulation

set -e  # Exit on error

echo "🚀 Starting Lightweight EAS Build Simulation..."
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Set production environment variables (like EAS does)
echo "🔧 Step 1: Setting production environment variables..."
export EAS_BUILD_PROFILE="production"
export NODE_ENV="production"
export CI="true"
export EXPO_NO_DOCTOR="true"
export EXPO_NO_TELEMETRY="true"
export NO_FLIPPER="1"
export EXPO_METRO_NO_SOURCE_MAPS="true"
export GENERATE_SOURCEMAP="false"
export EXPO_DEBUG="false"
echo -e "${GREEN}✅ Environment variables set${NC}"
echo ""

# Step 2: Verify dependencies are installed
echo "📦 Step 2: Verifying dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, installing...${NC}"
    npm install --legacy-peer-deps
fi
echo -e "${GREEN}✅ Dependencies directory exists${NC}"
echo ""

# Step 3: Verify critical dependencies
echo "🔍 Step 3: Verifying critical dependencies..."
node scripts/verify-dependencies.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Dependency verification failed!${NC}"
    exit 1
fi
echo ""

# Step 4: Test Babel configuration
echo "⚙️  Step 4: Testing Babel configuration..."
node scripts/test-babel-only.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Babel configuration test failed!${NC}"
    exit 1
fi
echo ""

# Step 5: Verify app.config.js loads correctly
echo "📱 Step 5: Testing app.config.js..."
node -e "
process.env.EAS_BUILD_PROFILE = 'production';
process.env.NODE_ENV = 'production';
const appConfig = require('./app.config.js');
const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
if (config && config.expo) {
  console.log('✅ app.config.js loaded successfully');
  console.log('App name:', config.expo.name || 'N/A');
  console.log('Plugins count:', config.expo.plugins ? config.expo.plugins.length : 0);
} else {
  console.log('✅ app.config.js loaded (structure may vary)');
}
"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ app.config.js test failed!${NC}"
    exit 1
fi
echo ""

# Step 6: Test Metro bundler with a simple entry point check
echo "📦 Step 6: Testing Metro entry point resolution..."
node -e "
try {
  const entry = require.resolve('./node_modules/expo-router/entry');
  console.log('✅ Expo Router entry point found:', entry);
} catch (e) {
  console.error('❌ Could not resolve expo-router entry:', e.message);
  process.exit(1);
}
"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Metro entry point test failed!${NC}"
    exit 1
fi

# Test @ alias path resolution
echo "   Testing @ alias path resolution..."
node -e "
const path = require('path');
const fs = require('fs');

// Test if @/components/ThemeSelector can be resolved
const testPaths = [
  'components/ThemeSelector.tsx',
  'components/ThemeSelector.js',
  'components/ThemeSelector.ts',
];

let found = false;
for (const testPath of testPaths) {
  const fullPath = path.join(process.cwd(), testPath);
  if (fs.existsSync(fullPath)) {
    console.log('✅ Found:', testPath);
    found = true;
    break;
  }
}

if (!found) {
  console.error('❌ @/components/ThemeSelector not found!');
  process.exit(1);
}
"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ @ alias path resolution test failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ @ alias paths can be resolved${NC}"
echo ""

# Step 7: Check for common issues
echo "🔎 Step 7: Checking for common build issues..."
ISSUES_FOUND=0

# Check if babel-plugin-module-resolver is in dependencies
if ! grep -q '"babel-plugin-module-resolver"' package.json; then
    echo -e "${RED}❌ babel-plugin-module-resolver not found in package.json${NC}"
    ISSUES_FOUND=1
fi

# Check if it's in dependencies (not devDependencies)
if grep -A 100 '"dependencies"' package.json | grep -q '"babel-plugin-module-resolver"'; then
    echo -e "${GREEN}✅ babel-plugin-module-resolver is in dependencies${NC}"
else
    echo -e "${RED}❌ babel-plugin-module-resolver should be in dependencies, not devDependencies${NC}"
    ISSUES_FOUND=1
fi

# Check if .npmrc exists
if [ -f ".npmrc" ]; then
    echo -e "${GREEN}✅ .npmrc file exists${NC}"
else
    echo -e "${YELLOW}⚠️  .npmrc file not found${NC}"
fi

# Check if eas.json has cache disabled
if grep -q '"disabled": true' eas.json; then
    echo -e "${GREEN}✅ Cache is disabled in eas.json${NC}"
else
    echo -e "${YELLOW}⚠️  Cache might not be disabled${NC}"
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No common issues found${NC}"
else
    echo -e "${RED}❌ Found $ISSUES_FOUND issue(s)${NC}"
    exit 1
fi
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}✅ Lightweight EAS Build Simulation Completed Successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Commit your changes:"
echo "   git add ."
echo "   git commit -m 'Fix babel-plugin-module-resolver build issue'"
echo "   git push"
echo ""
echo "2. Submit EAS build:"
echo "   eas build --platform ios --profile production"
echo ""
echo -e "${YELLOW}Note:${NC} This is a lightweight simulation."
echo "      For a complete simulation (cleans node_modules), run:"
echo "      npm run simulate:build"
echo ""
echo "      For native iOS compilation testing, you'll need to:"
echo "      - Run 'npx expo prebuild' locally, or"
echo "      - Submit an actual EAS build"

