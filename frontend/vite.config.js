import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import feel from '@feel-dev/vite-plugin';


// https://vite.dev/config/
export default defineConfig({
  plugins: [feel({ database: process.env.DATABASE_URL }),react()],
})
