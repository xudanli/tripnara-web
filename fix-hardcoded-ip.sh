#!/bin/bash
# 修复构建产物中硬编码的 IP 地址
# 用法: sudo bash fix-hardcoded-ip.sh /var/www/tripnara

set -e

DIST_DIR="${1:-/var/www/tripnara}"

if [ ! -d "$DIST_DIR" ]; then
    echo "错误: 目录不存在: $DIST_DIR"
    exit 1
fi

echo "=========================================="
echo "修复硬编码 IP 地址"
echo "目录: $DIST_DIR"
echo "=========================================="

# 1) 查找所有包含 IP 的文件
echo ""
echo "步骤 1: 查找包含硬编码 IP 的文件..."
IP_FILES=$(grep -r "47\.253\.148\.159" "$DIST_DIR" -l 2>/dev/null || true)

if [ -z "$IP_FILES" ]; then
    echo "✅ 未找到硬编码的 IP 地址"
    exit 0
fi

echo "找到以下文件包含硬编码 IP:"
echo "$IP_FILES" | while read -r file; do
    echo "  - $file"
done

# 2) 备份原始文件
echo ""
echo "步骤 2: 创建备份..."
BACKUP_DIR="${DIST_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
cp -r "$DIST_DIR" "$BACKUP_DIR"
echo "✅ 备份已创建: $BACKUP_DIR"

# 3) 替换硬编码 IP
echo ""
echo "步骤 3: 替换硬编码 IP 地址..."

# 替换各种可能的格式
find "$DIST_DIR" -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) -exec sed -i \
    -e 's|"http://47\.253\.148\.159"|"/api"|g' \
    -e "s|'http://47\.253\.148\.159'|'/api'|g" \
    -e 's|http://47\.253\.148\.159|/api|g' \
    -e 's|"https://47\.253\.148\.159"|"/api"|g' \
    -e "s|'https://47\.253\.148\.159'|'/api'|g" \
    -e 's|https://47\.253\.148\.159|/api|g' \
    {} \;

echo "✅ IP 地址已替换为 /api"

# 4) 验证替换结果
echo ""
echo "步骤 4: 验证替换结果..."
REMAINING_IP=$(grep -r "47\.253\.148\.159" "$DIST_DIR" 2>/dev/null | wc -l || echo "0")

if [ "$REMAINING_IP" -eq 0 ]; then
    echo "✅ 验证通过: 所有硬编码 IP 已替换"
else
    echo "⚠️  警告: 仍有 $REMAINING_IP 处包含硬编码 IP"
    echo "剩余位置:"
    grep -r "47\.253\.148\.159" "$DIST_DIR" 2>/dev/null | head -10
fi

echo ""
echo "=========================================="
echo "修复完成！"
echo "备份位置: $BACKUP_DIR"
echo "=========================================="
