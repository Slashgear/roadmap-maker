import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }
const appMode = process.env.VITE_APP_MODE ?? 'static'

export default defineConfig({
  root: 'client',
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_MODE__: JSON.stringify(appMode),
  },
  plugins: [
    preact(),

    // Bundle visualizer — only when ANALYZE=true
    ...(process.env.ANALYZE
      ? [visualizer({ open: true, gzipSize: true, brotliSize: true, filename: 'dist/stats.html' })]
      : []),
  ],
})
