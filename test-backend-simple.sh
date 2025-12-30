#!/bin/bash
# 简单的后端连接测试脚本

BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-4000}"

echo "测试后端服务: ${BACKEND_HOST}:${BACKEND_PORT}"
echo ""

# 使用nc测试端口是否开放
if command -v nc &> /dev/null; then
    echo "1. 测试端口连通性 (nc)..."
    if nc -z -v -w5 ${BACKEND_HOST} ${BACKEND_PORT} 2>&1; then
        echo "   ✅ 端口 ${BACKEND_PORT} 可访问"
    else
        echo "   ❌ 端口 ${BACKEND_PORT} 无法访问"
    fi
    echo ""
fi

# 使用curl测试HTTP
echo "2. 测试HTTP连接 (curl)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://${BACKEND_HOST}:${BACKEND_PORT}/" 2>&1)

if echo "$HTTP_CODE" | grep -qE "^[0-9]{3}$"; then
    echo "   ✅ HTTP状态码: ${HTTP_CODE}"
    echo ""
    echo "3. 测试常见端点..."
    for endpoint in "/health" "/api/health" "/api" "/ping"; do
        CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://${BACKEND_HOST}:${BACKEND_PORT}${endpoint}" 2>&1)
        if echo "$CODE" | grep -qE "^[0-9]{3}$"; then
            echo "   ${endpoint}: HTTP ${CODE}"
        fi
    done
else
    echo "   ❌ 连接失败: ${HTTP_CODE}"
    echo ""
    echo "提示: 如果后端在另一个devbox上，请运行:"
    echo "  BACKEND_HOST=<IP地址> BACKEND_PORT=<端口> ./test-backend-simple.sh"
fi

