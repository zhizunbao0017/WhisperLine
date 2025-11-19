#!/bin/bash

# Apple WWDR 证书检查脚本
# 用于诊断 WWDR 证书是否过期或缺失

echo "🔍 检查 Apple WWDR 证书状态..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 WWDR G4 证书
echo "检查 WWDR G4 证书（最新）..."
WWDR_G4=$(security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" -p 2>/dev/null | grep -i "G4" | head -1)

if [ -n "$WWDR_G4" ]; then
    echo -e "${GREEN}✓ WWDR G4 证书已安装${NC}"
    
    # 检查证书过期时间
    EXPIRY=$(echo "$WWDR_G4" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
        echo "  过期时间: $EXPIRY"
    fi
else
    echo -e "${RED}✗ WWDR G4 证书未找到${NC}"
fi

echo ""

# 检查 WWDR G3 证书
echo "检查 WWDR G3 证书（旧版）..."
WWDR_G3=$(security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" -p 2>/dev/null | grep -i "G3" | head -1)

if [ -n "$WWDR_G3" ]; then
    echo -e "${YELLOW}⚠ WWDR G3 证书已安装（建议使用 G4）${NC}"
else
    echo -e "${GREEN}✓ WWDR G3 证书未安装（正常，G4 已足够）${NC}"
fi

echo ""

# 检查所有 WWDR 相关证书
echo "检查所有 WWDR 相关证书..."
CERT_COUNT=$(security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" 2>/dev/null | grep -c "keychain:" || echo "0")

if [ "$CERT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ 找到 $CERT_COUNT 个 WWDR 证书${NC}"
    
    # 列出所有证书
    echo ""
    echo "证书列表："
    security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" 2>/dev/null | grep -A 2 "keychain:" | grep -E "(keychain:|labl)" | while read line; do
        if [[ $line == *"keychain:"* ]]; then
            KEYCHAIN=$(echo "$line" | cut -d: -f2 | xargs)
            echo "  - 钥匙串: $KEYCHAIN"
        elif [[ $line == *"labl"* ]]; then
            LABEL=$(echo "$line" | cut -d: -f2 | xargs)
            echo "    标签: $LABEL"
        fi
    done
else
    echo -e "${RED}✗ 未找到任何 WWDR 证书${NC}"
    echo ""
    echo "建议操作："
    echo "1. 下载最新的 WWDR G4 证书："
    echo "   curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer"
    echo ""
    echo "2. 安装证书："
    echo "   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain AppleWWDRCAG4.cer"
fi

echo ""

# 检查过期证书
echo "检查过期证书..."
EXPIRED_CERTS=$(security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" -Z 2>/dev/null | grep -i "expired" || echo "")

if [ -n "$EXPIRED_CERTS" ]; then
    echo -e "${RED}⚠ 发现过期证书，建议删除${NC}"
    echo ""
    echo "删除过期证书的方法："
    echo "1. 打开 钥匙串访问 (Keychain Access)"
    echo "2. 选择 系统 钥匙串"
    echo "3. 菜单栏：显示 > 显示已过期的证书"
    echo "4. 找到并删除过期的 WWDR 证书"
else
    echo -e "${GREEN}✓ 未发现过期证书${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 EAS 凭证状态
echo "📱 检查 EAS 凭证状态..."
echo ""
echo "提示：EAS 构建在云端运行，本地证书检查仅供参考。"
echo ""
echo "要检查 EAS 凭证，请运行："
echo "  eas credentials --platform ios"
echo ""
echo "或访问："
echo "  https://expo.dev/accounts/j8t/projects/whisperline/credentials"
echo ""

# 检查构建日志建议
echo "📋 下一步操作建议："
echo ""
echo "1. 查看最新的构建日志："
echo "   https://expo.dev/accounts/j8t/projects/whisperline/builds"
echo ""
echo "2. 在构建日志中搜索以下关键词："
echo "   - WWDR"
echo "   - certificate"
echo "   - code signing"
echo "   - provisioning profile"
echo ""
echo "3. 如果确认是证书问题，按照以下步骤修复："
echo "   a) 下载最新的 WWDR G4 证书"
echo "   b) 安装到系统钥匙串"
echo "   c) 删除过期证书"
echo "   d) 重新构建：eas build --platform ios --profile production --clear-cache"
echo ""

