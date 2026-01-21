/**
 * 动态配置文件
 * 
 * 此文件在运行时加载，用于配置 API 基础 URL 等设置。
 * 可以通过修改此文件来更改配置，无需重新构建应用。
 */

// 设置全局配置对象
window.__CONFIG__ = window.__CONFIG__ || {
  // API 基础 URL
  // 默认使用相对路径 /api（需要 Nginx 反代）
  // 如果需要使用绝对路径，可以设置为：apiBaseUrl: 'https://api.tripnara.com'
  apiBaseUrl: undefined, // undefined 表示使用默认值（/api）
  
  // 其他配置项可以在这里添加
  // environment: 'development',
  // version: '1.0.0',
};
