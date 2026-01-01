# 部署配置指南

## 生产环境 API 配置

### 推荐方式：同域反代（使用默认 `/api`）

**优势：**
- 无需配置 CORS
- Cookie SameSite 问题自动解决
- 配置简单，无需额外环境变量

**Nginx 配置示例：**

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000/;   # 你的后端服务地址
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

**部署步骤：**

1. 确保 `.env.production` 文件中**不设置** `VITE_API_BASE_URL`（或留空）
2. 构建前端：
   ```bash
   npm ci
   npm run build
   ```
3. 部署到服务器：
   ```bash
   sudo rsync -av --delete dist/ /var/www/tripnara/
   sudo nginx -t && sudo systemctl reload nginx
   ```

**验证：**
```bash
curl -i https://YOUR_FRONTEND_DOMAIN/api/health
```

### 备选方式：独立 API 域名

如果需要使用独立的 API 域名（如 `https://api.yourdomain.com`）：

1. 创建 `.env.production` 文件：
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

2. 构建前端：
   ```bash
   npm ci
   npm run build
   ```

3. 部署到服务器

**注意：** 使用独立域名需要配置 CORS 和后端的 Cookie 设置。

## 验证构建产物

确保构建产物中没有硬编码的旧域名：

```bash
grep -R "api.tripnara.com\|47.253.148.159" /var/www/tripnara/assets/*.js | head
```

如果没有任何输出，说明配置正确。

## 环境变量说明

### VITE_API_BASE_URL

- **类型**: 字符串（可选）
- **默认值**: `/api`（使用同域反代）
- **说明**: API 服务的基础 URL
- **示例**:
  - 不设置（推荐）：使用默认 `/api`，需要 Nginx 反代
  - 独立域名：`https://api.yourdomain.com`

### 其他环境变量

- `VITE_MAPBOX_TOKEN`: Mapbox 地图服务 Token
- `VITE_GOOGLE_CLIENT_ID`: Google 登录客户端 ID

## 完整部署流程

```bash
cd /srv/tripnara-frontend

# 1. 确认环境变量（如果使用独立 API 域名）
cat .env.production || true

# 2. 清理并构建
rm -rf dist
npm ci
npm run build

# 3. 部署到 Web 目录
sudo rsync -av --delete dist/ /var/www/tripnara/

# 4. 重新加载 Nginx
sudo nginx -t && sudo systemctl reload nginx

# 5. 验证（检查是否还有硬编码域名）
grep -R "api.tripnara.com\|47.253.148.159" /var/www/tripnara/assets/*.js | head
```

