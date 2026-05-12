import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/sessions': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    },
  },
  build: {
    // For production: output to static/ directory where FastAPI serves files
    // Note: This will replace existing static files during production build
    outDir: '../static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
})
