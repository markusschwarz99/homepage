import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Im Betrieb proxyt nginx /api auf retreat-backend; lokal übernimmt das Vite.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
