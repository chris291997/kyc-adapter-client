import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Get API URL from environment or default to localhost
// Note: Proxy only works in dev mode, not in production builds
// For production, the app uses VITE_API_URL directly
const getProxyTarget = () => {
  // If VITE_ENV is 'test', use Replit backend URL
  if (process.env.VITE_ENV === 'test') {
    return 'https://d58a3b08-335a-460b-b4c9-241ca526d77d-00-2bhyhl0y9qi5s.sisko.replit.dev:3000'
  }
  // Check for explicit proxy target
  if (process.env.VITE_PROXY_TARGET) {
    return process.env.VITE_PROXY_TARGET
  }
  // Fall back to API URL if set
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL
  }
  // Default to localhost for development
  return 'http://127.0.0.1:3000'
}

const PROXY_TARGET = getProxyTarget()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/constants': path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/auth': {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
      '/admin': {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
      '/tenant': {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
      '/verifications': {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
      '/accounts': {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
      '/webhooks': {
        target: PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
})

