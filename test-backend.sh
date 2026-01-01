#!/bin/bash
# 便捷的后端连接测试脚本
# 用法: ./test-backend.sh [IP地址] [端口]
# 示例: ./test-backend.sh 10.108.55.40 3000

BACKEND_HOST="${1:-${BACKEND_HOST:-127.0.0.1}}"
BACKEND_PORT="${2:-${BACKEND_PORT:-3000}}"

export BACKEND_HOST
export BACKEND_PORT

echo "使用配置: BACKEND_HOST=${BACKEND_HOST}, BACKEND_PORT=${BACKEND_PORT}"
echo ""

# 使用Python脚本测试（如果可用）
if command -v python3 &> /dev/null; then
    python3 test-backend-connection.py
else
    # 使用bash脚本测试
    ./test-backend-simple.sh
fi

