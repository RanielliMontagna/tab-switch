import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildSync } from 'esbuild'
import type { Plugin } from 'vite'

/**
 * Vite plugin to bundle background.js into a single file after build.
 * This ensures the background script doesn't have ES6 import statements
 * that would cause "Cannot use import statement outside a module" errors
 * in Chrome extension service workers.
 *
 * @returns Vite plugin instance
 */
export function backgroundBundlePlugin(): Plugin {
  return {
    name: 'background-bundle',
    writeBundle(options) {
      const backgroundFile = path.resolve(options.dir || 'build', 'background.js')

      try {
        const content = readFileSync(backgroundFile, 'utf-8')

        // Check if background.js has import statements
        if (content.includes('import') || content.includes('from')) {
          try {
            // Re-bundle using esbuild to inline all imports
            const result = buildSync({
              entryPoints: [backgroundFile],
              bundle: true,
              format: 'iife',
              write: false,
              minify: true,
              target: 'es2020',
              platform: 'browser',
              absWorkingDir: path.resolve(options.dir || 'build'),
            })

            if (result.outputFiles?.[0]) {
              writeFileSync(backgroundFile, result.outputFiles[0].text)
              console.log('✓ Bundled background.js into a single file')
            }
          } catch (esbuildError) {
            // esbuild might not be available or might fail
            // In that case, we'll rely on the manualChunks configuration
            console.warn('Could not re-bundle background.js with esbuild:', esbuildError)
            console.warn('Make sure background.js dependencies are inlined via manualChunks config')
          }
        }
      } catch (error) {
        // If background.js doesn't exist, that's okay (might not be built yet)
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('Could not process background.js:', error)
        }
      }
    },
  }
}
