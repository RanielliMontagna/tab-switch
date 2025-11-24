# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Global Error Boundary with friendly fallback UI
- Data migration system for versioning stored data
- Light/dark theme support with persistence
- Pause/resume rotation functionality without losing state
- Asynchronous URL validation with preview
- Keyboard shortcut (Ctrl+Space) to toggle rotation
- Skeleton loaders for loading states
- Retry system with exponential backoff
- Support for legacy import format (tab-rotate.json)
- Migration from localStorage to chrome.storage.local
- Data versioning system with migrations
- Lefthook configuration for pre-commit and pre-push hooks
- Comprehensive README with contribution guide and troubleshooting
- Release-please configuration for automated versioning

### Changed
- Migrated from ESLint + Prettier to Biome
- Migrated background.js to TypeScript
- Updated React 18 → 19
- Updated Tailwind CSS 3 → 4 (using @tailwindcss/vite and @theme)
- Updated i18next 24 → 25
- Updated react-i18next 15 → 16
- Updated zod 3 → 4
- Updated @hookform/resolvers 3 → 5
- Updated @dnd-kit/sortable 9 → 10
- Updated @vitejs/plugin-react 4 → 5
- Updated tailwind-merge 2 → 3
- Improved URL validation and sanitization
- Enhanced visual feedback during operations (drag & drop, deletion, saving)
- Improved input styling for theme compatibility
- Enhanced scroll behavior with many items

### Fixed
- Fixed input styling issue with theme
- Fixed scroll behavior with many items
- Fixed URL truncation for long URLs
- Fixed keyboard shortcut not working consistently
- Fixed TypeScript build errors related to messages
- Fixed tsconfig errors (added incremental, removed noUncheckedSideEffectImports)

### Security
- URL sanitization for imported URLs (only http/https allowed)
- Permission validation before using Chrome APIs
