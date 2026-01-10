FROM nginx:alpine
# 将构建出来的 dist 目录（Vue/React 默认目录）拷贝到 Nginx
COPY ./dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]