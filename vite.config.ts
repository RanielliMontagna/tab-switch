import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tsconfigPaths from 'vite-tsconfig-paths'
import { backgroundBundlePlugin } from './vite-plugins/background-bundle'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    backgroundBundlePlugin(),
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
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id, { getModuleInfo }) => {
          // Check if this is the background entry itself
          if (id.includes('src/background') || id.includes('background/index')) {
            return undefined // Background entry should be in its own file
          }

          // Get module info to check importers
          const moduleInfo = getModuleInfo(id)
          if (moduleInfo) {
            // Check if this module is imported by the background script
            const isImportedByBackground = moduleInfo.importers.some(
              (importer) =>
                importer.includes('src/background') ||
                importer.includes('background/index') ||
                importer.includes('background')
            )

            // If imported by background, inline it into the background entry
            if (isImportedByBackground) {
              return undefined // undefined means inline into the entry
            }
          }

          // Check if this module imports anything from background (shouldn't happen, but just in case)
          if (moduleInfo?.importers) {
            const importsBackground = moduleInfo.importers.some(
              (importer) => importer.includes('src/background') || importer.includes('background')
            )
            if (importsBackground) {
              return undefined
            }
          }

          // For other chunks (main entry), allow code splitting
          if (id.includes('node_modules')) {
            return 'vendor'
          }

          return undefined
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
