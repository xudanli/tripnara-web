# 前端代理配置指南

## 问题说明

当前错误：`404 (Not Found)` 请求 `http://localhost:5173/api/auth/email/send-code`

**问题原因**：
- 请求发送到了前端服务器端口 5173（Vite 开发服务器）
- 前端服务器没有 `/api` 接口，需要将 `/api` 请求代理到后端服务器（端口 3000）

## 当前配置

当前 `vite.config.ts` 已配置代理，将 `/api` 请求转发到后端：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',  // 后端服务器地址
      changeOrigin: true,
      secure: false,
      // 保留 /api 前缀，转发到后端
    },
  },
}
```

**配置说明**：
- `target`: 后端服务器地址（默认 `http://127.0.0.1:3000`，可通过环境变量 `VITE_BACKEND_HOST` 和 `VITE_BACKEND_PORT` 配置）
- `changeOrigin`: 改变请求的 origin，避免 CORS 问题
- `secure: false`: 允许自签名证书（如果使用 HTTPS）
- 默认保留 `/api` 前缀，转发到后端

**请求流程**：
- 前端请求 → `http://localhost:5173/api/auth/email/send-code`
- 代理转发 → `http://localhost:3000/api/auth/email/send-code`
- 后端处理 → 返回响应

## 如果后端不需要 /api 前缀

如果你的后端 API 不包含 `/api` 前缀（例如后端路径是 `/auth/email/send-code` 而不是 `/api/auth/email/send-code`），可以在 `vite.config.ts` 中添加 `rewrite`：

```typescript
'/api': {
  target: BACKEND_TARGET,
  changeOrigin: true,
  secure: false,
  rewrite: (path) => path.replace(/^\/api/, ''),  // 去掉 /api 前缀
}
```

这样 `/api/auth/email/send-code` 会被转发为 `/auth/email/send-code`。

## 配置后端地址（连接到远程后端）

如果需要连接到另一个 devbox 的后端服务，可以通过环境变量配置：

```bash
# 在 .env.development 或命令行中设置
export VITE_BACKEND_HOST=10.108.55.40
export VITE_BACKEND_PORT=3000
npm run dev
```

或者在同一命令中设置：

```bash
VITE_BACKEND_HOST=10.108.55.40 VITE_BACKEND_PORT=3000 npm run dev
```

## 验证配置

配置完成后，确保：

1. **后端服务正在运行**
   ```bash
   curl http://localhost:3000/api/health
   # 或
   curl http://10.108.55.40:3000/api/health
   ```

2. **重启前端开发服务器**
   ```bash
   # 停止当前服务器（Ctrl+C）
   npm run dev
   ```

3. **检查浏览器 Network 面板**
   - 查看实际请求的 URL
   - 确认是否被正确代理到后端

## 常见问题

### Q: 配置代理后仍然 404？

1. **确认后端服务运行在正确端口**
   ```bash
   # 检查后端是否在运行
   curl http://localhost:3000/api/health
   # 应该返回响应，而不是连接错误
   ```

2. **确认代理配置正确**
   - 检查 `vite.config.ts` 中的 `target` 是否为正确的后端地址
   - 查看 Vite 启动日志，确认代理目标地址
   - 重启前端开发服务器

3. **检查后端路径结构**
   - 确认后端 API 路径是否包含 `/api` 前缀
   - 如果不包含，需要添加 `rewrite` 规则去掉前缀

### Q: CORS 错误？

如果直接请求后端地址（不使用代理），需要确保后端 CORS 配置允许前端域名。

使用代理可以避免 CORS 问题，因为请求通过同域（前端服务器）发出。

### Q: 如何确认代理是否工作？

1. 查看 Vite 启动日志，应该看到：
   ```
   [vite] proxy target -> http://127.0.0.1:3000
   ```

2. 在浏览器 Network 面板中：
   - 请求 URL 应该是 `http://localhost:5173/api/...`
   - 响应应该来自后端服务器

3. 如果看到 404，检查：
   - 后端服务是否运行
   - 后端路径是否正确（是否需要 /api 前缀）

---

**最后更新**: 2024-12-30

