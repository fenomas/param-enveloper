import { defineConfig } from 'vite'

// used for locally serving the demo page, and building it to `/docs/` for GitHub Pages
export default defineConfig({
  root: 'demo/',
  base: '',

  build: {
    target: 'es2020',
    outDir: '../docs', // relative to root!
    emptyOutDir: true, // since it's outside root
    minify: true,
  },

  server: {
    port: 8080,
    host: '0.0.0.0',
  },

  clearScreen: false,
  logLevel: 'info',
})
