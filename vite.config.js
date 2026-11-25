import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@e965/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/lucide-react') || id.includes('node_modules/papaparse')) {
            return 'vendor-core';
          }
          if (id.includes('/src/data/allMonthsData')) {
            return 'data-months';
          }
          if (id.includes('/src/data/annualExcellenceData')) {
            return 'data-annual';
          }
        }
      }
    }
  }
})
