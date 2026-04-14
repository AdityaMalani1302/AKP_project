import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer - only in analyze mode
    // Run: npm run build:analyze
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // 'sunburst', 'treemap', 'network'
    })
  ].filter(Boolean),
  build: {
    // Optimize output
    // minify: 'terser', // Removed to use default esbuild (terser requires separate install)

    // Code splitting strategy
    rollupOptions: {
      output: {
        // Include content hash in filenames for proper cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries  
          'vendor-ui': ['react-select', 'react-icons', 'sonner'],
          // Charts library
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // Excel export (large - lazy loaded)
          'vendor-excel': ['exceljs'],
          // PDF export (large - lazy loaded)  
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'file-saver'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query', 'axios']
        }
      }
    },
    // Chunk size warnings - increased for export libs which are inherently large
    chunkSizeWarningLimit: 2000,
    // Source maps for production debugging (optional - remove if not needed)
    sourcemap: false,
    // Drop console.log and debugger in production
    minify: 'esbuild',
    target: 'esnext'
  },
  esbuild: {
    drop: ['console', 'debugger'],
    // Prevent minification issues with Three.js WebGL constants
    keepNames: true,
    // Avoid tree-shaking issues with dynamic imports
    treeShaking: true
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  },
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    // Enable HMR
    hmr: {
      overlay: true
    }
  }
}))
