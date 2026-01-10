# 第一阶段：构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 第二阶段：Nginx 部署阶段
FROM nginx:alpine

# 拷贝前端打包产物（通常是 dist 或 out 目录）到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 拷贝自定义 Nginx 配置（可选，用于处理 SPA 路由刷新 404 问题）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]