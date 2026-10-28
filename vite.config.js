import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: "/", // Changed from "./" to "/"
  server: {
    // Dev only: forward /api to the local backend (vercel.json handles this in production)
    proxy: {
      "/api": "http://localhost:5050",
    },
  },
  build: {
    outDir: "dist",
  },
})