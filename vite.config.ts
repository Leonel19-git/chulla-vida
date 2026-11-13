import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paymentsDev } from './scripts/payments-dev.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), paymentsDev()],
  server: { watch: { ignored: ['**/.impeccable/**'] } },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
            { name: 'icons', test: /node_modules[\/]lucide-react[\/]/ },
            { name: 'i18n', test: /src[\/]i18n[\/]/ },
            { name: 'catalog-data', test: /src[\/](domain[\/]catalog|data)[\/]/ },
          ],
        },
      },
    },
  },
})
