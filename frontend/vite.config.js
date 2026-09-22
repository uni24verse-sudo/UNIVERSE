import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'resolve-api-url-prod',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('/src/') && (id.endsWith('.js') || id.endsWith('.jsx'))) {
          // Replace fallback to localhost:5000 with empty string when building for production or non-empty VITE_API_URL
          if (process.env.NODE_ENV === 'production' || process.env.VITE_API_URL !== undefined) {
            return {
              code: code.replace(/import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"]http:\/\/localhost:5000['"]/g, "import.meta.env.VITE_API_URL || ''"),
              map: null
            };
          }
        }
      }
    }
  ],
})
