#!/usr/bin/env tsx
/**
 * Script to validate manifest.json before build
 * Ensures all required fields are present and valid
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface Manifest {
  manifest_version: number
  name: string
  version: string
  description: string
  permissions: string[]
  icons: Record<string, string>
  action?: {
    default_popup?: string
  }
  background?: {
    service_worker: string
  }
  content_security_policy?: {
    extension_pages?: string
  }
}

const REQUIRED_FIELDS = [
  'manifest_version',
  'name',
  'version',
  'description',
  'permissions',
  'icons',
] as const

const REQUIRED_ICON_SIZES = ['16', '48', '128'] as const

const REQUIRED_PERMISSIONS = ['storage', 'tabs'] as const

function validateManifest(manifestPath: string): boolean {
  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8')
    const manifest: Manifest = JSON.parse(manifestContent)

    let hasErrors = false

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in manifest)) {
        console.error(`❌ Missing required field: ${field}`)
        hasErrors = true
      }
    }

    // Validate manifest version
    if (manifest.manifest_version !== 3) {
      console.error(`❌ Invalid manifest_version: ${manifest.manifest_version}. Must be 3`)
      hasErrors = true
    }

    // Validate version format (semantic versioning)
    const versionRegex = /^\d+\.\d+\.\d+$/
    if (!versionRegex.test(manifest.version)) {
      console.error(
        `❌ Invalid version format: ${manifest.version}. Must be in format X.Y.Z (e.g., 1.0.0)`
      )
      hasErrors = true
    }

    // Validate name
    if (!manifest.name || manifest.name.trim().length === 0) {
      console.error('❌ Name cannot be empty')
      hasErrors = true
    }

    // Validate description
    if (!manifest.description || manifest.description.trim().length === 0) {
      console.error('❌ Description cannot be empty')
      hasErrors = true
    }

    // Validate icons
    if (manifest.icons) {
      for (const size of REQUIRED_ICON_SIZES) {
        if (!manifest.icons[size]) {
          console.error(`❌ Missing required icon size: ${size}`)
          hasErrors = true
        } else {
          // Check if icon path exists (basic check - file might not exist in build yet)
          const iconPath = manifest.icons[size]
          if (!iconPath || typeof iconPath !== 'string') {
            console.error(`❌ Invalid icon path for size ${size}: ${iconPath}`)
            hasErrors = true
          }
        }
      }
    } else {
      console.error('❌ Icons object is missing')
      hasErrors = true
    }

    // Validate permissions
    if (manifest.permissions) {
      if (!Array.isArray(manifest.permissions)) {
        console.error('❌ Permissions must be an array')
        hasErrors = true
      } else {
        for (const permission of REQUIRED_PERMISSIONS) {
          if (!manifest.permissions.includes(permission)) {
            console.error(`❌ Missing required permission: ${permission}`)
            hasErrors = true
          }
        }
      }
    } else {
      console.error('❌ Permissions array is missing')
      hasErrors = true
    }

    // Validate action (optional but recommended)
    if (manifest.action) {
      if (!manifest.action.default_popup) {
        console.warn('⚠️  Action default_popup is not set. Extension may not have a popup.')
      }
    }

    // Validate background service worker
    if (manifest.background) {
      if (!manifest.background.service_worker) {
        console.error('❌ Background service_worker is missing')
        hasErrors = true
      } else if (!manifest.background.service_worker.endsWith('.js')) {
        console.warn(
          `⚠️  Service worker file should end with .js: ${manifest.background.service_worker}`
        )
      }
    }

    // Validate CSP
    if (manifest.content_security_policy) {
      if (!manifest.content_security_policy.extension_pages) {
        console.warn('⚠️  Content Security Policy for extension_pages is not set')
      }
    }

    if (hasErrors) {
      console.error('\n❌ Manifest validation failed!')
      return false
    }

    console.log('✅ Manifest validation passed!')
    console.log(`   Name: ${manifest.name}`)
    console.log(`   Version: ${manifest.version}`)
    console.log(`   Permissions: ${manifest.permissions.join(', ')}`)
    console.log(`   Icon sizes: ${Object.keys(manifest.icons).join(', ')}`)
    return true
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ Invalid JSON in manifest.json:', error.message)
    } else if (error instanceof Error) {
      console.error('❌ Error reading manifest.json:', error.message)
    } else {
      console.error('❌ Unknown error:', error)
    }
    return false
  }
}

// Main execution
const manifestPath = join(process.cwd(), 'public', 'manifest.json')
const isValid = validateManifest(manifestPath)

if (!isValid) {
  process.exit(1)
}
