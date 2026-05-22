import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { yoSiteSeoPlugin } from './src/seo/vite-seo-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    yoSiteSeoPlugin(),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['lottie-web/build/player/lottie_light'],
  },
})
