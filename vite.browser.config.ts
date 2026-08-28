import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  publicDir: false,
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: 'browser-dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/browser.ts'),
      name: 'KomgaReader',
      formats: ['es', 'umd'],
      fileName: (format) => format === 'es' ? 'komga-reader.es.js' : 'komga-reader.umd.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
})
