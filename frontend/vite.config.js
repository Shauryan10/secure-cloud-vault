import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Output hashed JS/CSS into /static/ instead of /assets/
  // to avoid collision with the FastAPI /assets/ API route in nginx
  build: {
    assetsDir: 'static',
  },
  server: {
    proxy: {
      '/auth':   'http://127.0.0.1:8000',
      '/assets': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    }
  }
})
