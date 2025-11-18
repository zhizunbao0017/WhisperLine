#!/bin/bash

# WhisperLine 隐私政策 GitHub Pages 部署脚本
# 使用方法: ./scripts/deploy-privacy-policy.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 WhisperLine 隐私政策部署到 GitHub Pages${NC}"
echo "=================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "app.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查隐私政策文件是否存在
if [ ! -f "docs/privacy-policy.html" ]; then
    echo -e "${RED}错误: 找不到 docs/privacy-policy.html${NC}"
    exit 1
fi

# 获取仓库信息
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
    echo -e "${RED}错误: 未找到 Git 远程仓库${NC}"
    exit 1
fi

# 提取用户名和仓库名
if [[ $REPO_URL =~ github.com[:/]([^/]+)/([^/]+)\.git ]]; then
    GITHUB_USER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
    echo -e "${GREEN}✓ 检测到仓库: ${GITHUB_USER}/${REPO_NAME}${NC}"
else
    echo -e "${YELLOW}警告: 无法自动检测 GitHub 用户名和仓库名${NC}"
    read -p "请输入 GitHub 用户名: " GITHUB_USER
    read -p "请输入仓库名: " REPO_NAME
fi

echo ""
echo "选择部署方式:"
echo "1) 创建 gh-pages 分支 (推荐)"
echo "2) 创建独立的隐私政策仓库"
read -p "请选择 (1 或 2): " DEPLOY_OPTION

if [ "$DEPLOY_OPTION" = "1" ]; then
    echo ""
    echo -e "${BLUE}方式 1: 创建 gh-pages 分支${NC}"
    echo "--------------------------------"
    
    # 检查是否已有 gh-pages 分支
    if git show-ref --verify --quiet refs/heads/gh-pages; then
        echo -e "${YELLOW}gh-pages 分支已存在${NC}"
        read -p "是否删除并重新创建? (y/n): " RECREATE
        if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
            git branch -D gh-pages 2>/dev/null || true
        else
            echo "使用现有分支"
        fi
    fi
    
    # 创建或切换到 gh-pages 分支
    if ! git show-ref --verify --quiet refs/heads/gh-pages; then
        echo "创建 gh-pages 分支..."
        git checkout -b gh-pages
    else
        echo "切换到 gh-pages 分支..."
        git checkout gh-pages
    fi
    
    # 复制隐私政策文件到根目录
    echo "复制隐私政策文件..."
    cp docs/privacy-policy.html index.html
    
    # 提交更改
    echo "提交更改..."
    git add index.html
    git commit -m "Deploy privacy policy for App Store" || echo "没有更改需要提交"
    
    # 推送到远程
    echo "推送到 GitHub..."
    git push origin gh-pages
    
    echo ""
    echo -e "${GREEN}✓ 部署完成！${NC}"
    echo ""
    echo "下一步:"
    echo "1. 访问: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/pages"
    echo "2. 在 'Source' 下选择:"
    echo "   - Branch: gh-pages"
    echo "   - Folder: / (root)"
    echo "3. 点击 Save"
    echo ""
    echo -e "${BLUE}隐私政策 URL 将是:${NC}"
    echo "https://${GITHUB_USER}.github.io/${REPO_NAME}/"
    echo ""
    echo "注意: 首次部署可能需要几分钟才能生效"
    
    # 切换回主分支
    echo ""
    read -p "是否切换回主分支? (y/n): " SWITCH_BACK
    if [ "$SWITCH_BACK" = "y" ] || [ "$SWITCH_BACK" = "Y" ]; then
        git checkout main 2>/dev/null || git checkout master 2>/dev/null || echo "请手动切换分支"
    fi

elif [ "$DEPLOY_OPTION" = "2" ]; then
    echo ""
    echo -e "${BLUE}方式 2: 创建独立的隐私政策仓库${NC}"
    echo "--------------------------------"
    
    read -p "请输入新仓库名 (例如: whisperline-privacy-policy): " NEW_REPO_NAME
    
    if [ -z "$NEW_REPO_NAME" ]; then
        echo -e "${RED}错误: 仓库名不能为空${NC}"
        exit 1
    fi
    
    echo ""
    echo "请按照以下步骤操作:"
    echo ""
    echo "1. 在 GitHub 上创建新仓库: ${NEW_REPO_NAME}"
    echo "   https://github.com/new"
    echo ""
    echo "2. 创建后，运行以下命令:"
    echo ""
    echo "   mkdir -p /tmp/${NEW_REPO_NAME}"
    echo "   cd /tmp/${NEW_REPO_NAME}"
    echo "   git init"
    echo "   cp ${PWD}/docs/privacy-policy.html index.html"
    echo "   git add index.html"
    echo "   git commit -m 'Initial commit: Privacy Policy'"
    echo "   git branch -M main"
    echo "   git remote add origin https://github.com/${GITHUB_USER}/${NEW_REPO_NAME}.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. 在 GitHub 仓库设置中启用 Pages:"
    echo "   Settings → Pages → Source: main branch, / (root)"
    echo ""
    echo -e "${BLUE}隐私政策 URL 将是:${NC}"
    echo "https://${GITHUB_USER}.github.io/${NEW_REPO_NAME}/"
    
else
    echo -e "${RED}错误: 无效的选择${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}完成！${NC}"

