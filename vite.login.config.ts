import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * The public login page, built on its own into dist/auth/. middleware.ts serves
 * /auth/* without a session, so this build must share no chunks with the app
 * (which is why it isn't a second input of vite.config.ts).
 */
export default defineConfig({
  root: path.resolve(__dirname, 'src/login'),
  base: '/auth/',
  publicDir: false,
  envDir: __dirname, // .env.local sits at the project root, not in src/login
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: { postcss: __dirname },
  build: {
    outDir: path.resolve(__dirname, 'dist/auth'),
    emptyOutDir: true,
  },
})
