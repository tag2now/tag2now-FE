import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // target: 'http://localhost:8000',
        target: 'https://tag2now.click:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // test: {
  //   environment: 'jsdom',
  //   globals: true,
  //   setupFiles: ['./src/test/setup.ts'],
  // },
})
