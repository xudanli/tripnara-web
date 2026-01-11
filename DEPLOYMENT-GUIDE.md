# TripNara 前端部署指南

本文档记录了前端应用的完整部署流程和问题排查方法。

## 📋 部署架构

- **构建工具**: Jenkins (Docker Agent)
- **构建产物**: Vite 构建输出到 `dist/` 目录
- **Docker 镜像**: `loomtrip/tripnara-frontend:latest`
- **部署方式**: 静态文件部署到 `/var/www/tripnara/`
- **Web 服务器**: Nginx (宿主机，监听 80/443 端口)

## 🔄 完整部署流程

### 1. 代码提交和构建

```bash
# 1. 提交代码
git add .
git commit -m "feat: 你的更新描述"
git push

# 2. Jenkins 会自动触发构建
# 构建流程：
#   - Checkout 代码
#   - npm install
#   - npm run build (生成 dist/ 目录)
#   - Docker build (构建镜像)
#   - Docker push (推送到 Docker Hub)
```

### 2. 服务器端部署步骤

#### 2.1 检查构建状态

```bash
# 检查 Jenkins 构建是否成功
# 访问 Jenkins UI: http://your-server:8080
# 查看最新构建的日志，确认：
#   - ✅ Build Frontend 成功
#   - ✅ Docker Build & Push 成功
```

#### 2.2 从 Jenkins Workspace 复制最新文件

```bash
# 1. 备份旧文件（可选）
sudo cp -r /var/www/tripnara /var/www/tripnara.backup

# 2. 删除旧文件
sudo rm -rf /var/www/tripnara/*

# 3. 从 Jenkins workspace 复制最新构建文件
sudo docker cp jenkins:/var/jenkins_home/workspace/tripnara-frontend/dist/. /tmp/tripnara-dist/

# 4. 移动到目标目录
sudo cp -r /tmp/tripnara-dist/* /var/www/tripnara/

# 5. 设置正确的权限
sudo chown -R www-data:www-data /var/www/tripnara
sudo chmod -R 755 /var/www/tripnara

# 6. 清理临时目录
sudo rm -rf /tmp/tripnara-dist
```

#### 2.3 验证文件更新

```bash
# 检查文件时间戳（应该是最新的构建时间）
ls -la /var/www/tripnara/index.html
ls -la /var/www/tripnara/assets/

# 验证文件大小（最新版本）：
# - index.html: 1058 bytes
# - assets/index-FRzL2N9e.css: ~126 KB
# - assets/index-XcYSQjx0.js: ~1.6 MB
```

#### 2.4 重新加载 Nginx

```bash
# 测试 Nginx 配置
sudo nginx -t

# 重新加载 Nginx（不中断服务）
sudo systemctl reload nginx

# 或者完全重启（如果需要）
sudo systemctl restart nginx
```

### 3. 验证部署

```bash
# 1. 检查文件内容（确认包含最新代码）
grep -i "nara\|agent" /var/www/tripnara/assets/index-*.js | head -5

# 2. 检查 Nginx 日志（如果有问题）
sudo tail -f /var/log/nginx/error.log

# 3. 浏览器端验证
#    - 使用硬刷新: Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac)
#    - 或使用无痕模式测试
```

## 🔍 问题排查

### 问题1: 页面没有更新

**可能原因**:
1. 文件没有正确复制
2. 浏览器缓存
3. Nginx 缓存
4. CDN 缓存

**解决步骤**:

```bash
# 1. 确认文件已更新
stat /var/www/tripnara/index.html
# 检查 Modify 时间是否为最新

# 2. 检查文件内容
cat /var/www/tripnara/index.html
# 确认文件大小和内容正确

# 3. 清除 Nginx 缓存（如果有）
sudo find /var/cache/nginx -type f -delete 2>/dev/null
sudo systemctl restart nginx

# 4. 浏览器端
#    - 硬刷新: Ctrl+Shift+R
#    - 清除浏览器缓存
#    - 使用无痕模式测试
```

### 问题2: Docker 构建失败

**可能原因**:
1. Docker CLI 版本过旧
2. Docker socket 未挂载
3. Docker Hub 认证失败

**解决步骤**:

```bash
# 检查 Jenkinsfile 中的 Docker 配置
# 确保：
# 1. Docker socket 已挂载: -v /var/run/docker.sock:/var/run/docker.sock
# 2. 使用最新版本的 docker-ce-cli
# 3. Docker Hub 凭据配置正确
```

### 问题3: 文件权限问题

**症状**: `docker cp` 时出现 "permission denied"

**解决方案**:

```bash
# 使用临时目录中转
sudo docker cp jenkins:/path/to/source/. /tmp/temp-dir/
sudo cp -r /tmp/temp-dir/* /var/www/tripnara/
sudo chown -R www-data:www-data /var/www/tripnara
sudo chmod -R 755 /var/www/tripnara
```

### 问题4: Nginx 端口冲突

**症状**: `tripnara-web` 容器无法启动，错误: "address already in use"

**原因**: 宿主机 Nginx 已占用 80 端口

**解决方案**: 
- 使用宿主机 Nginx 服务静态文件（当前方案）
- 或停止宿主机 Nginx，使用容器内的 Nginx

## 📝 快速部署脚本

可以创建一个部署脚本 `deploy-frontend.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 开始部署前端应用..."

# 1. 备份
echo "📦 备份旧文件..."
sudo cp -r /var/www/tripnara /var/www/tripnara.backup.$(date +%Y%m%d_%H%M%S)

# 2. 清理
echo "🧹 清理旧文件..."
sudo rm -rf /var/www/tripnara/*

# 3. 复制最新文件
echo "📥 从 Jenkins workspace 复制文件..."
sudo docker cp jenkins:/var/jenkins_home/workspace/tripnara-frontend/dist/. /tmp/tripnara-dist/
sudo cp -r /tmp/tripnara-dist/* /var/www/tripnara/
sudo rm -rf /tmp/tripnara-dist

# 4. 设置权限
echo "🔐 设置文件权限..."
sudo chown -R www-data:www-data /var/www/tripnara
sudo chmod -R 755 /var/www/tripnara

# 5. 验证
echo "✅ 验证文件..."
ls -la /var/www/tripnara/index.html
ls -la /var/www/tripnara/assets/ | head -5

# 6. 重新加载 Nginx
echo "🔄 重新加载 Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "🎉 部署完成！"
echo "💡 提示: 请清除浏览器缓存 (Ctrl+Shift+R) 查看最新内容"
```

使用方法:
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

## 📊 文件验证清单

部署后验证以下内容：

- [ ] `index.html` 文件大小: 1058 bytes
- [ ] `assets/index-FRzL2N9e.css` 存在且大小约 126 KB
- [ ] `assets/index-XcYSQjx0.js` 存在且大小约 1.6 MB
- [ ] 文件时间戳为最新构建时间
- [ ] Nginx 配置测试通过
- [ ] Nginx 已重新加载
- [ ] 浏览器硬刷新后能看到最新内容

## 🔗 相关文件

- **Jenkinsfile**: 构建配置
- **Dockerfile**: Docker 镜像构建配置
- **nginx.conf**: Nginx 配置（在 Docker 镜像中）
- **/etc/nginx/sites-enabled/tripnara**: 宿主机 Nginx 配置

## 📌 重要提示

1. **始终从 Jenkins workspace 复制文件**，而不是从 Docker 镜像，因为 workspace 中的文件是最新的构建产物
2. **文件权限很重要**: 确保 `/var/www/tripnara` 的所有者是 `www-data:www-data`
3. **清除浏览器缓存**: 部署后务必使用硬刷新查看最新内容
4. **备份旧文件**: 部署前建议备份，以便快速回滚

## 🚨 紧急回滚

如果需要回滚到之前的版本:

```bash
# 1. 恢复备份
sudo rm -rf /var/www/tripnara/*
sudo cp -r /var/www/tripnara.backup.XXXXXX/* /var/www/tripnara/
sudo chown -R www-data:www-data /var/www/tripnara
sudo systemctl reload nginx

# 2. 或从之前的 Docker 镜像恢复
docker pull loomtrip/tripnara-frontend:<previous-tag>
docker create --name temp-frontend loomtrip/tripnara-frontend:<previous-tag>
sudo docker cp temp-frontend:/usr/share/nginx/html/. /var/www/tripnara/
docker rm temp-frontend
sudo chown -R www-data:www-data /var/www/tripnara
sudo systemctl reload nginx
```
