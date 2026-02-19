import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    middlewareMode: false,
    port: 5173,
    host: '0.0.0.0', // 모든 인터페이스에서 수신
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.1.27',      // IP 주소
      'mem.photos',         // 도메인
      'mem.photos:15173',   // 도메인:포트
      '.mem.photos',        // 와일드카드 (서브도메인 포함)
    ],
    // HMR (Hot Module Replacement) 설정 - 이것이 중요!
    hmr: {
      host: undefined, // 자동 감지
      port: undefined,
      protocol: undefined,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})