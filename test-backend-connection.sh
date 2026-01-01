#!/bin/bash

# 测试后端接口连通性脚本

echo "=== 后端接口连通性测试 ==="
echo ""

# 从环境变量或配置文件读取后端地址
# 默认使用 vite.config.ts 中的 proxy target
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"

echo "后端服务地址: ${BACKEND_URL}"
echo ""

# 测试基本连通性（通常是健康检查或根路径）
echo "1. 测试基本连通性..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BACKEND_URL}/" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ 无法连接到后端服务 (连接超时或网络错误)"
    echo "   请检查:"
    echo "   - 后端服务是否正在运行"
    echo "   - 网络是否可达 (${BACKEND_HOST}:${BACKEND_PORT})"
    echo "   - 防火墙设置"
else
    echo "   ✅ HTTP状态码: ${HTTP_CODE}"
fi

echo ""

# 测试常见的健康检查端点
echo "2. 测试健康检查端点..."
HEALTH_ENDPOINTS=("/health" "/api/health" "/healthz" "/ping" "/status")

for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BACKEND_URL}${endpoint}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "404" ]; then
        echo "   ✅ ${endpoint}: HTTP ${HTTP_CODE}"
        curl -s "${BACKEND_URL}${endpoint}" | head -20
        echo ""
        break
    fi
done

echo ""

# 测试API端点（通常是 /api 前缀）
echo "3. 测试API端点..."
API_ENDPOINTS=("/api" "/api/" "/api/v1" "/api/v1/health")

for endpoint in "${API_ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BACKEND_URL}${endpoint}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ]; then
        echo "   ${endpoint}: HTTP ${HTTP_CODE}"
    fi
done

echo ""

# 显示详细连接信息
echo "4. 详细连接信息..."
curl -v "${BACKEND_URL}/" --connect-timeout 5 2>&1 | head -30

echo ""
echo "=== 测试完成 ==="
echo ""
echo "提示: 如果后端服务在另一个devbox上，请设置环境变量:"
echo "  export BACKEND_HOST=<另一个devbox的IP或主机名>"
echo "  export BACKEND_PORT=<后端服务端口>"
echo "  ./test-backend-connection.sh"

