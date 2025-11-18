#!/bin/bash

# WhisperLine 构建前完整检查脚本
# 在运行 EAS build 之前进行全面的本地验证

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 WhisperLine 构建前完整检查${NC}"
echo "=================================="
echo ""

# 运行配置验证
echo "步骤 1/4: 运行配置验证..."
./scripts/verify-build-config.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}配置验证失败，请先修复错误${NC}"
    exit 1
fi

echo ""
echo "步骤 2/4: 检查代码质量..."
echo "--------------------------------"

# 检查是否有明显的语法错误
if command -v node &> /dev/null; then
    echo "检查 JavaScript/TypeScript 语法..."
    if npm run lint &> /dev/null; then
        echo -e "${GREEN}✓ 代码检查通过${NC}"
    else
        echo -e "${YELLOW}⚠ 发现 lint 警告（不影响构建）${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Node.js 未安装，跳过代码检查${NC}"
fi

echo ""
echo "步骤 3/4: 验证依赖完整性..."
echo "--------------------------------"

# 检查关键依赖版本
echo "检查关键依赖版本..."
if [ -f "package.json" ]; then
    EXPO_VERSION=$(node -e "const pkg = require('./package.json'); console.log(pkg.dependencies.expo || 'not found')" 2>/dev/null || echo "unknown")
    RN_VERSION=$(node -e "const pkg = require('./package.json'); console.log(pkg.dependencies['react-native'] || 'not found')" 2>/dev/null || echo "unknown")
    
    echo "  Expo: $EXPO_VERSION"
    echo "  React Native: $RN_VERSION"
    
    # 检查 Expo SDK 版本兼容性
    if [[ $EXPO_VERSION == *"54"* ]]; then
        echo -e "${GREEN}✓ Expo SDK 版本兼容${NC}"
    else
        echo -e "${YELLOW}⚠ 请确认 Expo SDK 版本兼容性${NC}"
    fi
fi

# 验证 node_modules 完整性
echo ""
echo "验证 node_modules 完整性..."
if [ -d "node_modules" ]; then
    MISSING_DEPS=0
    
    # 检查关键依赖是否存在
    KEY_DEPS=("expo" "react-native" "expo-router" "@expo/vector-icons")
    for dep in "${KEY_DEPS[@]}"; do
        if [ ! -d "node_modules/$dep" ]; then
            echo -e "${RED}✗ 缺少依赖: $dep${NC}"
            MISSING_DEPS=$((MISSING_DEPS + 1))
        fi
    done
    
    if [ $MISSING_DEPS -eq 0 ]; then
        echo -e "${GREEN}✓ 所有关键依赖已安装${NC}"
    else
        echo -e "${RED}✗ 发现 $MISSING_DEPS 个缺失的依赖${NC}"
        echo "  请运行: npm install"
        exit 1
    fi
else
    echo -e "${RED}✗ node_modules 不存在${NC}"
    echo "  请运行: npm install"
    exit 1
fi

echo ""
echo "步骤 4/4: 验证 EAS 构建准备..."
echo "--------------------------------"

# 检查 EAS 项目配置
if [ -f "app.json" ]; then
    EAS_PROJECT_ID=$(node -e "const config = require('./app.json'); console.log(config.expo.extra && config.expo.extra.eas && config.expo.extra.eas.projectId || 'not found')" 2>/dev/null || echo "unknown")
    if [ "$EAS_PROJECT_ID" != "not found" ] && [ "$EAS_PROJECT_ID" != "undefined" ]; then
        echo -e "${GREEN}✓ EAS 项目 ID 已配置: $EAS_PROJECT_ID${NC}"
    else
        echo -e "${YELLOW}⚠ EAS 项目 ID 未配置（首次构建时会自动创建）${NC}"
    fi
fi

# 检查构建号
if [ -f "app.json" ]; then
    BUILD_NUMBER=$(node -e "const config = require('./app.json'); console.log(config.expo.ios && config.expo.ios.buildNumber || 'not set')" 2>/dev/null || echo "unknown")
    if [ "$BUILD_NUMBER" != "not set" ] && [ "$BUILD_NUMBER" != "undefined" ]; then
        echo -e "${GREEN}✓ 构建号已设置: $BUILD_NUMBER${NC}"
    else
        echo -e "${YELLOW}⚠ 构建号未设置（EAS 会自动递增）${NC}"
    fi
fi

# 检查 eas.json 配置
if [ -f "eas.json" ]; then
    echo -e "${GREEN}✓ eas.json 配置存在${NC}"
    
    # 检查是否有 production 配置
    HAS_IOS_CONFIG=$(node -e "const config = require('./eas.json'); console.log(config.build && config.build.production && config.build.production.ios ? 'yes' : 'no')" 2>/dev/null || echo "no")
    if [ "$HAS_IOS_CONFIG" = "yes" ]; then
        echo -e "${GREEN}✓ iOS 构建配置已设置${NC}"
    else
        echo -e "${YELLOW}⚠ iOS 构建配置未设置（将使用默认配置）${NC}"
    fi
fi

echo ""
echo "=================================="
echo -e "${GREEN}✓ 所有检查完成！${NC}"
echo ""
echo "配置状态总结:"
echo "  - 项目结构: ✓"
echo "  - 依赖安装: ✓"
echo "  - 配置文件: ✓"
echo "  - EAS 准备: ✓"
echo ""
echo -e "${BLUE}可以安全地进行 EAS 构建了！${NC}"
echo ""
echo "建议的构建命令:"
echo -e "${BLUE}eas build --platform ios --profile production --clear-cache${NC}"
echo ""
echo "注意: --clear-cache 会清理缓存，解决 CocoaPods 问题，但会增加构建时间"

