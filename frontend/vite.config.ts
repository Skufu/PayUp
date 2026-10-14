import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = process.env.PORT?.trim() || '8080'
const proxyTarget = process.env.VITE_API_PROXY_TARGET?.trim() || `http://localhost:${backendPort}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Drop console and debugger in production builds
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    proxy: {
      '/v1': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Vendor chunks - rarely change, cache longer
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Increase chunk size warning limit (optional, adjust as needed)
    chunkSizeWarningLimit: 500,
    // Generate sourcemaps for production debugging
    sourcemap: true,
  },
})
