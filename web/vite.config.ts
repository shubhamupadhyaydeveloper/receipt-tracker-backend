import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api calls to the Fastify backend during local development
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
