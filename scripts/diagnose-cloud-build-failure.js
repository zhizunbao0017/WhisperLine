#!/usr/bin/env node

/**
 * 全面诊断 EAS 云端构建失败的原因
 * 分析所有可能导致构建失败的配置和依赖问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 EAS 云端构建失败全面诊断\n');
console.log('='.repeat(70));

let issues = [];
let warnings = [];
let passed = [];

// 检查 1: package.json 关键依赖
console.log('\n1️⃣  检查 package.json 关键依赖...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};
  
  const criticalDeps = [
    'babel-plugin-module-resolver',
    'babel-plugin-transform-replace-expressions'
  ];
  
  for (const dep of criticalDeps) {
    if (deps[dep]) {
      console.log(`   ✅ ${dep}: ${deps[dep]} (在 dependencies)`);
      passed.push(`${dep} 在 dependencies 中`);
    } else if (devDeps[dep]) {
      console.log(`   ⚠️  ${dep}: ${devDeps[dep]} (在 devDependencies)`);
      warnings.push(`${dep} 在 devDependencies 中，production 构建可能找不到`);
      issues.push(`${dep} 应该在 dependencies 中，而不是 devDependencies`);
    } else {
      console.log(`   ❌ ${dep}: 未找到`);
      issues.push(`${dep} 未在 package.json 中`);
    }
  }
} catch (e) {
  console.log(`   ❌ 无法读取 package.json: ${e.message}`);
  issues.push('无法读取 package.json');
}

// 检查 2: node_modules 中是否存在关键依赖
console.log('\n2️⃣  检查 node_modules 中的关键依赖...');
const criticalDeps = [
  'babel-plugin-module-resolver',
  'babel-plugin-transform-replace-expressions'
];

for (const dep of criticalDeps) {
  try {
    const resolved = require.resolve(dep);
    console.log(`   ✅ ${dep} 已安装: ${resolved}`);
    passed.push(`${dep} 在 node_modules 中`);
  } catch (e) {
    console.log(`   ❌ ${dep} 未安装`);
    issues.push(`${dep} 未在 node_modules 中，需要运行 npm install`);
  }
}

// 检查 3: package-lock.json 是否存在
console.log('\n3️⃣  检查 package-lock.json...');
if (fs.existsSync('package-lock.json')) {
  console.log('   ✅ package-lock.json 存在');
  passed.push('package-lock.json 存在');
  
  // 检查是否包含关键依赖
  try {
    const lockFile = fs.readFileSync('package-lock.json', 'utf-8');
    const lockJson = JSON.parse(lockFile);
    
    for (const dep of criticalDeps) {
      if (lockJson.packages && lockJson.packages[`node_modules/${dep}`]) {
        console.log(`   ✅ ${dep} 在 package-lock.json 中`);
      } else if (lockJson.dependencies && lockJson.dependencies[dep]) {
        console.log(`   ✅ ${dep} 在 package-lock.json 中`);
      } else {
        console.log(`   ⚠️  ${dep} 可能不在 package-lock.json 中`);
        warnings.push(`${dep} 可能不在 package-lock.json 中`);
      }
    }
  } catch (e) {
    console.log(`   ⚠️  无法解析 package-lock.json: ${e.message}`);
    warnings.push('package-lock.json 可能损坏');
  }
} else {
  console.log('   ❌ package-lock.json 不存在');
  issues.push('package-lock.json 不存在，EAS 构建可能无法正确安装依赖');
}

// 检查 4: babel.config.js 配置
console.log('\n4️⃣  检查 babel.config.js 配置...');
try {
  const babelConfig = fs.readFileSync('babel.config.js', 'utf-8');
  
  // 检查是否有 module-resolver 插件
  if (babelConfig.includes('module-resolver') || babelConfig.includes('babel-plugin-module-resolver')) {
    console.log('   ✅ babel.config.js 包含 module-resolver 配置');
    passed.push('babel.config.js 配置正确');
  } else {
    console.log('   ❌ babel.config.js 未找到 module-resolver 配置');
    issues.push('babel.config.js 缺少 module-resolver 配置');
  }
  
  // 检查是否有 require.resolve 验证
  if (babelConfig.includes('require.resolve') && babelConfig.includes('babel-plugin-module-resolver')) {
    console.log('   ✅ babel.config.js 包含插件存在性验证');
    passed.push('babel.config.js 有插件验证');
  } else {
    console.log('   ⚠️  babel.config.js 缺少插件存在性验证');
    warnings.push('babel.config.js 应该验证插件是否存在');
  }
} catch (e) {
  console.log(`   ❌ 无法读取 babel.config.js: ${e.message}`);
  issues.push('无法读取 babel.config.js');
}

// 检查 5: eas.json 配置
console.log('\n5️⃣  检查 eas.json 配置...');
try {
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf-8'));
  const production = easJson.build?.production;
  
  if (production) {
    console.log('   ✅ production profile 已配置');
    passed.push('eas.json production profile 存在');
    
    // 检查缓存配置
    if (production.cache && production.cache.disabled === true) {
      console.log('   ✅ 缓存已禁用（推荐）');
      passed.push('缓存已禁用');
    } else {
      console.log('   ⚠️  缓存未禁用，可能使用旧的损坏缓存');
      warnings.push('建议禁用缓存以避免使用损坏的依赖缓存');
    }
    
    // 检查环境变量
    if (production.env && production.env.NODE_ENV === 'production') {
      console.log('   ✅ NODE_ENV=production 已设置');
      passed.push('NODE_ENV 配置正确');
    }
  } else {
    console.log('   ❌ production profile 未配置');
    issues.push('eas.json 缺少 production profile');
  }
} catch (e) {
  console.log(`   ❌ 无法读取 eas.json: ${e.message}`);
  issues.push('无法读取 eas.json');
}

// 检查 6: app.json 配置
console.log('\n6️⃣  检查 app.json 配置...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf-8'));
  
  if (appJson.expo?.ios?.bundleIdentifier) {
    console.log(`   ✅ Bundle ID: ${appJson.expo.ios.bundleIdentifier}`);
    passed.push('Bundle ID 已配置');
  } else {
    console.log('   ❌ Bundle ID 未配置');
    issues.push('app.json 缺少 Bundle ID');
  }
  
  if (appJson.expo?.extra?.eas?.projectId) {
    console.log(`   ✅ EAS Project ID: ${appJson.expo.extra.eas.projectId}`);
    passed.push('EAS Project ID 已配置');
  } else {
    console.log('   ⚠️  EAS Project ID 未配置');
    warnings.push('EAS Project ID 未配置，可能影响构建');
  }
} catch (e) {
  console.log(`   ❌ 无法读取 app.json: ${e.message}`);
  issues.push('无法读取 app.json');
}

// 检查 7: Git 状态
console.log('\n7️⃣  检查 Git 状态...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  const modifiedFiles = gitStatus.split('\n').filter(Boolean);
  
  const importantFiles = ['package.json', 'package-lock.json', 'babel.config.js', 'eas.json'];
  const modifiedImportant = modifiedFiles.filter(f => 
    importantFiles.some(imp => f.includes(imp))
  );
  
  if (modifiedImportant.length > 0) {
    console.log(`   ⚠️  有重要文件未提交:`);
    modifiedImportant.forEach(f => console.log(`      - ${f.trim()}`));
    warnings.push('有重要文件未提交，EAS 构建可能使用旧版本');
  } else {
    console.log('   ✅ 重要文件已提交');
    passed.push('重要文件已提交');
  }
} catch (e) {
  console.log(`   ⚠️  无法检查 Git 状态: ${e.message}`);
  warnings.push('无法检查 Git 状态');
}

// 检查 8: 本地构建测试
console.log('\n8️⃣  检查本地构建能力...');
try {
  // 检查 expo export 是否能成功
  console.log('   ℹ️  运行本地生产构建测试...');
  try {
    execSync('npx expo export -p ios 2>&1 | head -20', { encoding: 'utf-8', timeout: 30000 });
    console.log('   ✅ 本地 expo export 测试通过');
    passed.push('本地构建测试通过');
  } catch (e) {
    const output = e.stdout || e.stderr || e.message;
    if (output.includes('babel-plugin-module-resolver')) {
      console.log('   ❌ 本地构建失败：babel-plugin-module-resolver 错误');
      issues.push('本地构建失败，babel-plugin-module-resolver 问题');
    } else {
      console.log('   ⚠️  本地构建测试未完成（可能需要更长时间）');
      warnings.push('本地构建测试未完成');
    }
  }
} catch (e) {
  console.log('   ⚠️  无法运行本地构建测试');
  warnings.push('无法运行本地构建测试');
}

// 总结报告
console.log('\n' + '='.repeat(70));
console.log('\n📊 诊断总结:\n');

if (passed.length > 0) {
  console.log(`✅ 通过项 (${passed.length}):`);
  passed.forEach(item => console.log(`   - ${item}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log(`⚠️  警告项 (${warnings.length}):`);
  warnings.forEach(item => console.log(`   - ${item}`));
  console.log('');
}

if (issues.length > 0) {
  console.log(`❌ 问题项 (${issues.length}):`);
  issues.forEach(item => console.log(`   - ${item}`));
  console.log('');
}

// 修复建议
console.log('='.repeat(70));
console.log('\n💡 修复建议:\n');

if (issues.length > 0) {
  console.log('🔧 必须修复的问题:\n');
  
  // 检查依赖问题
  if (issues.some(i => i.includes('babel-plugin-module-resolver') && i.includes('未在'))) {
    console.log('1. 重新安装依赖:');
    console.log('   rm -rf node_modules package-lock.json');
    console.log('   npm install');
    console.log('   npm install babel-plugin-module-resolver --save\n');
  }
  
  // 检查 package-lock.json
  if (issues.some(i => i.includes('package-lock.json'))) {
    console.log('2. 生成并提交 package-lock.json:');
    console.log('   npm install');
    console.log('   git add package-lock.json');
    console.log('   git commit -m "Add package-lock.json"');
    console.log('   git push\n');
  }
  
  // 检查配置文件
  if (issues.some(i => i.includes('无法读取'))) {
    console.log('3. 检查配置文件是否存在且格式正确\n');
  }
}

console.log('🚀 推荐的构建流程:\n');
console.log('1. 确保所有更改已提交:');
console.log('   git add .');
console.log('   git commit -m "Fix: ensure all dependencies are properly configured"');
console.log('   git push\n');

console.log('2. 清理并重新构建:');
console.log('   eas build --platform ios --profile production --clear-cache\n');

console.log('3. 如果仍然失败，查看构建日志:');
console.log('   - 访问 https://expo.dev/accounts/j8t/projects/whisperline/builds');
console.log('   - 查看最新的构建日志');
console.log('   - 重点查看 "Installing dependencies" 和 "Bundle" 阶段\n');

console.log('4. 常见失败原因检查清单:');
console.log('   □ Bundle 阶段失败 → 检查 babel-plugin-module-resolver 是否在 dependencies');
console.log('   □ Installing dependencies 失败 → 检查 package-lock.json 是否已提交');
console.log('   □ Code signing 失败 → 检查 EAS 凭证配置');
console.log('   □ Pod install 失败 → 检查 Podfile 配置\n');

console.log('='.repeat(70));

// 退出码
if (issues.length > 0) {
  console.log('\n❌ 发现关键问题，请先修复后再构建\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  有警告项，建议修复后再构建\n');
  process.exit(0);
} else {
  console.log('\n✅ 所有检查通过，可以尝试构建\n');
  process.exit(0);
}

