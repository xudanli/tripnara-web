# 环境变量配置修复

## 问题说明

当前 `.env.development` 文件中配置了旧的端口：

```
VITE_API_BASE_URL=http://localhost:43000
```

这会导致 API 请求失败，因为：
1. 端口 43000 不正确（应该是 3000 或使用默认 `/api`）
2. 在开发环境中，应该使用默认的 `/api`，让 Vite 代理转发到后端

## 修复方法

### 方法 1：删除该配置（推荐）

删除 `.env.development` 文件中的 `VITE_API_BASE_URL` 行，让代码使用默认的 `/api`：

```bash
# 编辑文件
nano .env.development

# 删除或注释掉这一行：
# VITE_API_BASE_URL=http://localhost:43000
```

### 方法 2：修改为正确的端口（如果后端确实在 3000 端口）

```bash
# 编辑文件
nano .env.development

# 修改为：
VITE_API_BASE_URL=http://localhost:3000
```

**注意**：推荐使用方法 1，因为：
- 开发环境使用 `/api` 可以让 Vite 代理自动转发（已在 `vite.config.ts` 中配置）
- 无需手动配置端口，配置更简单
- 与生产环境的部署方式保持一致（使用 Nginx 反代）

## 重启开发服务器

修改后需要重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

## 验证

启动后检查浏览器控制台，应该不再有 `:43000` 相关的错误。

