import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

console.log('[vite] proxy target -> http://127.0.0.1:43000')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:43000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
