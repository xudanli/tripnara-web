import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// 支持通过环境变量配置后端地址（用于连接到另一个devbox）
// 从 .env 文件中加载环境变量
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  const BACKEND_HOST = env.VITE_BACKEND_HOST || '127.0.0.1'
  const BACKEND_PORT = env.VITE_BACKEND_PORT || '3000'
  const BACKEND_TARGET = `http://${BACKEND_HOST}:${BACKEND_PORT}`

  console.log(`[vite] proxy target -> ${BACKEND_TARGET}`)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          // 重要：确保 Cookie 正确转发（跨域 Cookie 问题修复）
          cookieDomainRewrite: {
            '*': '', // 将所有域的 Cookie 重写为当前域
          },
          cookiePathRewrite: {
            '*': '/', // 将所有路径重写为根路径
          },
          // 保留 /api 前缀，转发到后端
          // 如果后端不需要 /api 前缀，取消下面的注释：
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React 相关库（react, react-dom, react-router-dom）
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI 组件库（@radix-ui）
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // 工具库（date-fns, axios, i18next 等）
            if (id.includes('date-fns') || id.includes('axios') || id.includes('i18next')) {
              return 'utils-vendor';
            }
            // 图表库（recharts）
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            // API 层代码
            if (id.includes('/src/api/')) {
              return 'api';
            }
            // 类型定义（通常较小，可以合并）
            if (id.includes('/src/types/')) {
              return 'types';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
    },
  }
})
