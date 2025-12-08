import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    },
    // Code splitting strategy
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['react-select', 'react-icons'],
          // Charts library (heavy)
          'vendor-charts': ['recharts']
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (optional - remove if not needed)
    sourcemap: false
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  },
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    // Enable HMR
    hmr: {
      overlay: true
    }
  }
})
