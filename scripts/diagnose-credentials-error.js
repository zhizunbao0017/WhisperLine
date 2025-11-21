#!/usr/bin/env node

/**
 * 诊断 EAS 本地构建 "Prepare credentials" 阶段失败的原因
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 EAS 本地构建凭证准备阶段失败诊断\n');
console.log('=' .repeat(60));

// 检查 1: EAS CLI 版本
console.log('\n1️⃣  检查 EAS CLI 版本...');
try {
  const version = execSync('eas --version', { encoding: 'utf-8' }).trim();
  console.log(`   ✅ EAS CLI 版本: ${version}`);
} catch (e) {
  console.log('   ❌ EAS CLI 未安装或无法访问');
  console.log('   解决方案: npm install -g eas-cli');
  process.exit(1);
}

// 检查 2: 是否登录 EAS
console.log('\n2️⃣  检查 EAS 登录状态...');
try {
  const whoami = execSync('eas whoami', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  console.log(`   ✅ 已登录: ${whoami}`);
} catch (e) {
  console.log('   ⚠️  未登录或无法验证登录状态');
  console.log('   解决方案: eas login');
}

// 检查 3: app.json 配置
console.log('\n3️⃣  检查 app.json 配置...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf-8'));
  const bundleId = appJson.expo?.ios?.bundleIdentifier;
  const projectId = appJson.expo?.extra?.eas?.projectId;
  
  if (bundleId) {
    console.log(`   ✅ Bundle ID: ${bundleId}`);
  } else {
    console.log('   ❌ Bundle ID 未配置');
  }
  
  if (projectId) {
    console.log(`   ✅ EAS Project ID: ${projectId}`);
  } else {
    console.log('   ⚠️  EAS Project ID 未配置');
  }
} catch (e) {
  console.log('   ❌ 无法读取 app.json:', e.message);
}

// 检查 4: eas.json 配置
console.log('\n4️⃣  检查 eas.json 配置...');
try {
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf-8'));
  const productionProfile = easJson.build?.production;
  
  if (productionProfile) {
    console.log('   ✅ production profile 已配置');
    if (productionProfile.ios) {
      console.log(`   ✅ iOS 配置: ${JSON.stringify(productionProfile.ios)}`);
    }
  } else {
    console.log('   ❌ production profile 未配置');
  }
} catch (e) {
  console.log('   ❌ 无法读取 eas.json:', e.message);
}

// 检查 5: 本地钥匙串访问权限
console.log('\n5️⃣  检查本地钥匙串访问权限...');
try {
  const keychains = execSync('security list-keychains', { encoding: 'utf-8' });
  console.log('   ✅ 钥匙串访问正常');
  console.log('   钥匙串列表:');
  keychains.split('\n').filter(Boolean).forEach(k => {
    console.log(`      - ${k.trim()}`);
  });
} catch (e) {
  console.log('   ⚠️  无法访问钥匙串:', e.message);
  console.log('   这可能影响本地构建的凭证准备');
}

// 检查 6: Apple Developer 证书
console.log('\n6️⃣  检查本地 Apple Developer 证书...');
try {
  const certs = execSync('security find-identity -v -p codesigning', { encoding: 'utf-8' });
  const certCount = certs.split('\n').filter(line => line.includes('Apple Development') || line.includes('Apple Distribution')).length;
  if (certCount > 0) {
    console.log(`   ✅ 找到 ${certCount} 个代码签名证书`);
  } else {
    console.log('   ⚠️  未找到 Apple Developer 代码签名证书');
    console.log('   注意: EAS 本地构建可能需要访问这些证书');
  }
} catch (e) {
  console.log('   ⚠️  无法检查证书:', e.message);
}

// 检查 7: 网络连接
console.log('\n7️⃣  检查网络连接（Apple Developer 服务）...');
try {
  execSync('curl -s -o /dev/null -w "%{http_code}" https://developer.apple.com', { timeout: 5000 });
  console.log('   ✅ 可以访问 Apple Developer 网站');
} catch (e) {
  console.log('   ⚠️  无法访问 Apple Developer 网站');
  console.log('   这可能导致凭证准备失败');
}

// 总结和建议
console.log('\n' + '='.repeat(60));
console.log('\n📋 诊断总结和建议:\n');

console.log('根据错误信息 "Prepare credentials build phase" 失败，可能的原因：\n');

console.log('1. 🔐 EAS 凭证配置问题');
console.log('   解决方案:');
console.log('   - 运行: eas credentials --platform ios');
console.log('   - 选择 production profile');
console.log('   - 选择 "Set up new credentials" 或 "Update existing credentials"');
console.log('   - 确保 Apple Developer 账户状态正常\n');

console.log('2. 🌐 网络连接问题');
console.log('   解决方案:');
console.log('   - 检查网络连接');
console.log('   - 确保可以访问 Apple Developer 服务');
console.log('   - 如果使用代理，确保 EAS CLI 可以访问\n');

console.log('3. 🔑 本地钥匙串权限问题');
console.log('   解决方案:');
console.log('   - 确保终端有钥匙串访问权限');
console.log('   - 在"系统设置" → "隐私与安全性" → "完全磁盘访问权限"中授权终端\n');

console.log('4. 📦 EAS Project 配置问题');
console.log('   解决方案:');
console.log('   - 确认 app.json 中的 EAS projectId 正确');
console.log('   - 确认 eas.json 中的 production profile 配置正确\n');

console.log('5. 🚀 尝试使用云端构建（推荐）');
console.log('   如果本地构建持续失败，建议使用云端构建:');
console.log('   eas build --platform ios --profile production');
console.log('   云端构建不需要本地凭证准备，EAS 会自动管理所有凭证\n');

console.log('='.repeat(60));
console.log('\n💡 快速修复尝试:\n');
console.log('1. 重新配置凭证:');
console.log('   eas credentials --platform ios\n');
console.log('2. 清理缓存并重新构建:');
console.log('   eas build --platform ios --profile production --clear-cache\n');
console.log('3. 如果使用本地构建，尝试云端构建:');
console.log('   eas build --platform ios --profile production\n');

