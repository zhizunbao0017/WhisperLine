#!/bin/bash

# WhisperLine App Store 发布准备脚本
# 使用方法: ./scripts/prepare-release.sh

set -e

echo "🚀 WhisperLine App Store 发布准备"
echo "=================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "app.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 1. 检查 EAS CLI 是否安装
echo "📦 检查 EAS CLI..."
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}警告: EAS CLI 未安装。正在安装...${NC}"
    npm install -g eas-cli
else
    echo -e "${GREEN}✓ EAS CLI 已安装${NC}"
fi

# 2. 检查是否已登录
echo ""
echo "🔐 检查 EAS 登录状态..."
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}需要登录 EAS。请运行: eas login${NC}"
    exit 1
else
    echo -e "${GREEN}✓ 已登录 EAS${NC}"
fi

# 3. 检查 app.json 配置
echo ""
echo "📋 检查 app.json 配置..."

VERSION=$(grep -A 1 '"version"' app.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
BUILD_NUMBER=$(grep -A 1 '"buildNumber"' app.json | grep -o '[0-9]\+' | head -1)
BUNDLE_ID=$(grep -A 1 '"bundleIdentifier"' app.json | grep -o 'com\.[^"]*' | head -1)

echo "  版本号: $VERSION"
echo "  构建号: $BUILD_NUMBER"
echo "  Bundle ID: $BUNDLE_ID"

# 4. 检查必要的文件
echo ""
echo "📁 检查必要文件..."

FILES_TO_CHECK=(
    "app.json"
    "eas.json"
    "assets/images/icon.png"
    "screens/PrivacyPolicyScreen.js"
)

MISSING_FILES=()
for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}✗ 缺少以下文件:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
else
    echo -e "${GREEN}✓ 所有必要文件存在${NC}"
fi

# 5. 运行 lint 检查
echo ""
echo "🔍 运行代码检查..."
if npm run lint 2>&1 | grep -q "error"; then
    echo -e "${YELLOW}警告: 发现 lint 错误，建议修复后再发布${NC}"
else
    echo -e "${GREEN}✓ 代码检查通过${NC}"
fi

# 6. 显示下一步操作
echo ""
echo "=================================="
echo -e "${GREEN}✓ 准备完成！${NC}"
echo ""
echo "下一步操作:"
echo ""
echo "1. 构建生产版本:"
echo "   ${YELLOW}eas build --platform ios --profile production${NC}"
echo ""
echo "2. 等待构建完成 (约15-30分钟)"
echo ""
echo "3. 提交到 App Store:"
echo "   ${YELLOW}eas submit --platform ios --latest${NC}"
echo ""
echo "4. 在 App Store Connect 中:"
echo "   - 填写应用元数据"
echo "   - 上传应用截图"
echo "   - 设置定价和可用性"
echo "   - 提交审核"
echo ""
echo "详细说明请查看: docs/APP_STORE_RELEASE_CHECKLIST.md"
echo ""

