# 后端连接问题排查指南

## 问题现象

从控制台日志可以看到：
- ✅ Token 已正确添加（`hasToken: true`）
- ✅ Authorization header 已添加
- ❌ 错误类型：`ECONNABORTED`（请求超时）
- ❌ 错误消息：`网络错误,请检查网络连接`

**这不是 401 认证问题，而是后端服务连接问题！**

---

## 快速诊断

### 步骤 1: 检查后端服务是否运行

在终端运行：

```bash
# 检查后端服务是否在运行
curl -I http://localhost:3000/api/health 2>&1

# 或者检查端口是否被占用
netstat -tuln | grep 3000
# 或
ss -tuln | grep 3000
```

**预期结果**：
- ✅ 如果后端运行正常，应该返回 HTTP 响应（如 200 或 404）
- ❌ 如果返回 `Connection refused` 或 `Failed to connect`，说明后端服务未运行

### 步骤 2: 检查 Vite 代理配置

查看 Vite 启动日志，应该看到：

```
[vite] proxy target -> http://127.0.0.1:3000
```

如果看到不同的地址，检查：
1. `.env.development` 文件中的 `VITE_BACKEND_HOST` 和 `VITE_BACKEND_PORT`
2. `vite.config.ts` 中的代理配置

### 步骤 3: 检查浏览器 Network 标签

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 尝试创建行程
4. 找到失败的请求：`POST /api/trips/from-natural-language`
5. 查看请求详情：
   - **Status**: 应该是 `(failed)` 或 `ECONNABORTED`
   - **Type**: 应该是 `xhr` 或 `fetch`
   - **Request URL**: 应该是 `http://localhost:5173/api/trips/from-natural-language`
   - **Request Headers**: 应该包含 `Authorization: Bearer ...`

---

## 解决方案

### 方案 1: 启动后端服务（如果未运行）

如果后端服务未运行，需要启动它：

```bash
# 进入后端项目目录（根据实际情况调整）
cd /path/to/backend

# 启动后端服务
npm start
# 或
node server.js
# 或
yarn start
```

**验证后端服务**：
```bash
# 测试后端健康检查接口
curl http://localhost:3000/api/health

# 或测试任意接口
curl http://localhost:3000/api/trips
```

### 方案 2: 检查后端服务地址

如果后端服务运行在不同的地址或端口：

1. **检查后端实际运行地址**：
   ```bash
   # 查看后端服务监听的地址和端口
   netstat -tuln | grep LISTEN
   ```

2. **更新 Vite 代理配置**：
   
   编辑 `.env.development` 文件：
   ```bash
   VITE_BACKEND_HOST=127.0.0.1  # 或实际的后端 IP
   VITE_BACKEND_PORT=3000        # 或实际的后端端口
   ```

3. **重启前端开发服务器**：
   ```bash
   # 停止当前服务器（Ctrl+C）
   npm run dev
   ```

### 方案 3: 增加请求超时时间

如果后端服务响应太慢（超过 10 秒），可以增加超时时间：

编辑 `src/api/client.ts`：

```typescript
const apiClient = axios.create({
  baseURL,
  timeout: 30000,  // 从 10000 改为 30000（30 秒）
  // ...
});
```

**注意**：这只能解决响应慢的问题，如果后端服务未运行，仍然会失败。

### 方案 4: 检查防火墙和网络

如果后端服务运行在远程服务器：

1. **检查防火墙规则**：
   ```bash
   # 检查防火墙是否阻止了端口 3000
   sudo ufw status
   # 或
   sudo iptables -L -n
   ```

2. **检查网络连接**：
   ```bash
   # 测试网络连接
   ping <backend-host>
   telnet <backend-host> 3000
   ```

---

## 常见错误和解决方案

### 错误 1: `ECONNABORTED`（请求超时）

**原因**：
- 后端服务未运行
- 后端服务响应太慢（超过 10 秒）
- 网络连接问题

**解决方案**：
1. 确认后端服务正在运行
2. 检查后端服务日志，查看是否有错误
3. 增加超时时间（见方案 3）
4. 检查网络连接

### 错误 2: `ERR_NETWORK` 或 `ECONNREFUSED`

**原因**：
- 后端服务未运行
- 后端服务地址或端口配置错误
- 防火墙阻止连接

**解决方案**：
1. 启动后端服务
2. 检查 `vite.config.ts` 中的代理配置
3. 检查 `.env.development` 中的后端地址配置
4. 检查防火墙规则

### 错误 3: `404 Not Found`

**原因**：
- 后端 API 路径不正确
- 代理配置错误（可能需要去掉 `/api` 前缀）

**解决方案**：
1. 检查后端 API 路径是否正确
2. 如果后端不需要 `/api` 前缀，在 `vite.config.ts` 中添加 `rewrite`：
   ```typescript
   '/api': {
     target: BACKEND_TARGET,
     changeOrigin: true,
     secure: false,
     rewrite: (path) => path.replace(/^\/api/, ''),  // 去掉 /api 前缀
   }
   ```

---

## 验证修复

修复后，重新测试：

1. **刷新页面**
2. **打开浏览器控制台**
3. **尝试创建行程**
4. **查看日志**，应该看到：
   ```
   [API Client] 请求: { url: '/trips/from-natural-language', hasToken: true, ... }
   [API Client] ✅ 已添加 Authorization header
   [API Client] ✅ 响应成功: { status: 200, ... }
   ```

如果仍然失败，检查：
- 后端服务日志
- 浏览器 Network 标签中的请求详情
- 控制台中的错误日志

---

## 调试技巧

### 1. 手动测试后端 API

```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试创建行程接口（需要 token）
curl -X POST http://localhost:3000/api/trips/from-natural-language \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"text":"帮我规划带娃去冰岛5天的行程,预算10万"}'
```

### 2. 检查 Vite 代理日志

在 Vite 开发服务器的终端中，应该能看到代理请求的日志。

### 3. 使用浏览器 Network 标签

- 查看请求的完整 URL
- 查看请求 Headers（确认 Authorization header 存在）
- 查看响应状态和内容
- 查看 Timing 信息（了解请求耗时）

---

**最后更新**: 2024-12-31

