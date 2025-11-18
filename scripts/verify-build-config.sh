#!/bin/bash

# WhisperLine 构建配置验证脚本
# 在运行 EAS build 之前验证所有配置是否正确

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 WhisperLine 构建配置验证${NC}"
echo "=================================="
echo ""

ERRORS=0
WARNINGS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# 1. 检查是否在项目根目录
echo "1. 检查项目结构..."
if [ ! -f "app.json" ]; then
    check_fail "未找到 app.json，请在项目根目录运行此脚本"
    exit 1
fi
check_pass "项目根目录正确"

# 2. 检查必要的文件
echo ""
echo "2. 检查必要文件..."
FILES=("app.json" "package.json" "eas.json" "ios/Podfile")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "找到 $file"
    else
        check_fail "缺少 $file"
    fi
done

# 3. 验证 app.json 配置
echo ""
echo "3. 验证 app.json 配置..."
if command -v node &> /dev/null; then
    BUNDLE_ID=$(node -e "const config = require('./app.json'); console.log(config.expo.ios.bundleIdentifier)" 2>/dev/null || echo "")
    VERSION=$(node -e "const config = require('./app.json'); console.log(config.expo.version)" 2>/dev/null || echo "")
    BUILD_NUMBER=$(node -e "const config = require('./app.json'); console.log(config.expo.ios.buildNumber)" 2>/dev/null || echo "")
    
    if [ -n "$BUNDLE_ID" ] && [ "$BUNDLE_ID" != "undefined" ]; then
        check_pass "Bundle ID: $BUNDLE_ID"
    else
        check_fail "Bundle ID 未配置"
    fi
    
    if [ -n "$VERSION" ] && [ "$VERSION" != "undefined" ]; then
        check_pass "版本号: $VERSION"
    else
        check_fail "版本号未配置"
    fi
    
    if [ -n "$BUILD_NUMBER" ] && [ "$BUILD_NUMBER" != "undefined" ]; then
        check_pass "构建号: $BUILD_NUMBER"
    else
        check_warn "构建号未配置（EAS 会自动递增）"
    fi
else
    check_warn "Node.js 未安装，跳过 JSON 验证"
fi

# 4. 检查依赖安装
echo ""
echo "4. 检查依赖..."
if [ -d "node_modules" ]; then
    check_pass "node_modules 目录存在"
    
    # 检查关键依赖
    KEY_DEPS=("expo" "react-native" "expo-router")
    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            check_pass "$dep 已安装"
        else
            check_fail "$dep 未安装"
        fi
    done
else
    check_fail "node_modules 不存在，请运行 npm install"
fi

# 5. 检查 package.json 和 package-lock.json 同步
echo ""
echo "5. 检查依赖同步..."
if [ -f "package-lock.json" ]; then
    check_pass "package-lock.json 存在"
    
    # 尝试运行 npm ci 的 dry-run（如果支持）
    if npm ci --dry-run &> /dev/null; then
        check_pass "package.json 和 package-lock.json 同步"
    else
        check_warn "package.json 和 package-lock.json 可能不同步"
    fi
else
    check_fail "package-lock.json 不存在"
fi

# 6. 检查 EAS 配置
echo ""
echo "6. 验证 EAS 配置..."
if [ -f "eas.json" ]; then
    if command -v node &> /dev/null; then
        # 验证 JSON 格式
        if node -e "require('./eas.json')" &> /dev/null; then
            check_pass "eas.json JSON 格式正确"
        else
            check_fail "eas.json JSON 格式错误"
        fi
        
        # 检查 production 配置
        HAS_PRODUCTION=$(node -e "const config = require('./eas.json'); console.log(config.build && config.build.production ? 'yes' : 'no')" 2>/dev/null || echo "no")
        if [ "$HAS_PRODUCTION" = "yes" ]; then
            check_pass "production 构建配置存在"
        else
            check_fail "production 构建配置缺失"
        fi
    else
        check_warn "Node.js 未安装，跳过 JSON 验证"
    fi
fi

# 7. 检查 iOS 配置
echo ""
echo "7. 检查 iOS 配置..."
if [ -d "ios" ]; then
    check_pass "ios 目录存在"
    
    if [ -f "ios/Podfile" ]; then
        check_pass "Podfile 存在"
        
        # 检查 Podfile.lock
        if [ -f "ios/Podfile.lock" ]; then
            check_pass "Podfile.lock 存在"
        else
            check_warn "Podfile.lock 不存在（首次构建时会生成）"
        fi
    else
        check_fail "Podfile 不存在"
    fi
else
    check_warn "ios 目录不存在（EAS 会自动生成）"
fi

# 8. 检查 EAS CLI
echo ""
echo "8. 检查 EAS CLI..."
if command -v eas &> /dev/null; then
    EAS_VERSION=$(eas --version 2>/dev/null || echo "unknown")
    check_pass "EAS CLI 已安装: $EAS_VERSION"
    
    # 检查登录状态
    if eas whoami &> /dev/null; then
        USER=$(eas whoami 2>/dev/null || echo "unknown")
        check_pass "EAS 已登录: $USER"
    else
        check_fail "EAS 未登录，请运行: eas login"
    fi
else
    check_fail "EAS CLI 未安装，请运行: npm install -g eas-cli"
fi

# 9. 检查原生模块兼容性
echo ""
echo "9. 检查原生模块..."
PROBLEMATIC_DEPS=("@dr.pogodin/react-native-static-server")
for dep in "${PROBLEMATIC_DEPS[@]}"; do
    if grep -q "$dep" package.json; then
        check_warn "检测到可能有问题的依赖: $dep"
        echo "   建议: 如果构建失败，考虑暂时移除此依赖"
    fi
done

# 10. 验证权限描述
echo ""
echo "10. 检查权限配置..."
if command -v node &> /dev/null; then
    REQUIRED_PERMISSIONS=("NSPhotoLibraryUsageDescription" "NSCameraUsageDescription" "NSLocationWhenInUseUsageDescription" "NSFaceIDUsageDescription")
    for perm in "${REQUIRED_PERMISSIONS[@]}"; do
        HAS_PERM=$(node -e "const config = require('./app.json'); console.log(config.expo.ios && config.expo.ios.infoPlist && config.expo.ios.infoPlist.$perm ? 'yes' : 'no')" 2>/dev/null || echo "no")
        if [ "$HAS_PERM" = "yes" ]; then
            check_pass "$perm 已配置"
        else
            check_fail "$perm 未配置"
        fi
    done
fi

# 11. 尝试本地 pod install（如果可能）
echo ""
echo "11. 测试 CocoaPods 配置..."
if [ -d "ios" ] && [ -f "ios/Podfile" ]; then
    if command -v pod &> /dev/null; then
        echo "   运行 pod install --dry-run..."
        cd ios
        if pod install --dry-run &> /dev/null; then
            check_pass "Podfile 配置有效"
        else
            check_warn "Podfile 验证失败（可能是网络问题）"
        fi
        cd ..
    else
        check_warn "CocoaPods 未安装，跳过本地验证"
    fi
else
    check_warn "ios 目录不存在，跳过 CocoaPods 验证"
fi

# 总结
echo ""
echo "=================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！可以安全地进行 EAS 构建${NC}"
    echo ""
    echo "运行构建命令:"
    echo -e "${BLUE}eas build --platform ios --profile production${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ 发现 $WARNINGS 个警告，但可以尝试构建${NC}"
    echo ""
    echo "建议先修复警告，然后运行:"
    echo -e "${BLUE}eas build --platform ios --profile production${NC}"
    exit 0
else
    echo -e "${RED}✗ 发现 $ERRORS 个错误和 $WARNINGS 个警告${NC}"
    echo ""
    echo "请先修复错误后再进行构建"
    exit 1
fi

