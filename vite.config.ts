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
          // 保留 /api 前缀，转发到后端
          // 如果后端不需要 /api 前缀，取消下面的注释：
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
