import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
})()
const gitBranch = (() => {
  try { return execSync('git rev-parse --abbrev-ref HEAD').toString().trim() } catch { return 'unknown' }
})()
const gitSubject = (() => {
  try { return execSync('git log -1 --pretty=%s').toString().trim() } catch { return '' }
})()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ShoppingList/',
  define: {
    __BUILD_HASH__: JSON.stringify(gitHash),
    __BUILD_BRANCH__: JSON.stringify(gitBranch),
    __BUILD_SUBJECT__: JSON.stringify(gitSubject),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@supabase/')) return 'supabase'
          if (id.includes('node_modules/react-dom/')) return 'react-dom'
          if (id.includes('node_modules/react/')) return 'react'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
