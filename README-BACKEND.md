# 后端服务连接配置

## 测试后端连接

### 方式1: 使用便捷脚本（推荐）
```bash
./test-backend.sh <后端IP地址> <端口>
# 示例:
./test-backend.sh 10.108.55.40 3000
```

### 方式2: 直接设置环境变量运行
```bash
BACKEND_HOST=10.108.55.40 BACKEND_PORT=3000 python3 test-backend-connection.py
```

### 方式3: 导出环境变量后运行
```bash
export BACKEND_HOST=10.108.55.40
export BACKEND_PORT=3000
python3 test-backend-connection.py
```

## 开发时连接到远程后端

如果后端服务在另一个devbox上，需要在启动开发服务器时设置环境变量：

```bash
# 设置后端地址
export VITE_BACKEND_HOST=10.108.55.40
export VITE_BACKEND_PORT=3000

# 启动开发服务器
npm run dev
```

或者在同一命令中设置：
```bash
VITE_BACKEND_HOST=10.108.55.40 VITE_BACKEND_PORT=3000 npm run dev
```

## 默认配置

- **默认后端地址**: `127.0.0.1:3000` (本地)
- **测试脚本默认端口**: `3000`
- **Vite代理默认端口**: `3000`

## 查看当前IP地址

如果需要在另一个devbox上找到IP地址，可以运行：
```bash
hostname -I
# 或
ip addr show | grep "inet " | grep -v "127.0.0.1"
```

