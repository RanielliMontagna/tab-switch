/**
 * Application constants
 */

// Form defaults
export const FORM_DEFAULTS = {
  NAME: '',
  URL: '',
  INTERVAL: 5000,
  SAVED: false,
} as const

// Interval constraints
export const INTERVAL = {
  MIN: 5000,
  STEP: 1000,
  DEFAULT_PLACEHOLDER: '1000',
} as const

// File operations
export const FILE = {
  EXPORT_NAME: 'tabs.json',
  ACCEPT_TYPE: '.json',
  MIME_TYPE: 'application/json',
} as const

// UI dimensions
export const UI = {
  POPUP_WIDTH: 800,
  POPUP_HEIGHT: 400,
  LOGO_SIZE: 60,
  ICON_SIZE: 16,
} as const

// Validation
export const VALIDATION = {
  MIN_TABS_FOR_ROTATION: 2,
} as const
