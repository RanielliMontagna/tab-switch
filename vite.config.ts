import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        },
        {
          src: 'public/favicon/**',
          dest: 'favicon',
        },
      ],
    }),
  ],
  build: {
    outDir: 'build',
    // Optimize bundle size
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
        background: './src/background/index.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'
        },
        // Code splitting: separate vendor chunks
        manualChunks: (id) => {
          // Separate node_modules into vendor chunk
          if (id.includes('node_modules')) {
            // Separate large libraries into their own chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd'
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            // All other node_modules
            return 'vendor'
          }
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
