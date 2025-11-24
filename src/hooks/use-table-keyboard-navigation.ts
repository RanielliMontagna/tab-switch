/**
 * Hook for keyboard navigation in tables
 * Provides arrow key navigation, Enter to activate, and Escape to cancel
 */

import { useEffect, useRef } from 'react'

interface UseTableKeyboardNavigationOptions {
  /**
   * Number of rows in the table
   */
  rowCount: number
  /**
   * Number of columns in the table
   */
  columnCount: number
  /**
   * Callback when Enter is pressed on a row
   */
  onEnter?: (rowIndex: number, columnIndex: number) => void
  /**
   * Callback when Escape is pressed
   */
  onEscape?: () => void
  /**
   * Whether navigation is enabled
   */
  enabled?: boolean
}

/**
 * Hook for keyboard navigation in tables
 * Supports arrow keys, Enter, and Escape
 */
export function useTableKeyboardNavigation({
  rowCount,
  columnCount,
  onEnter,
  onEscape,
  enabled = true,
}: UseTableKeyboardNavigationOptions) {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const currentRowRef = useRef<number>(-1)
  const currentColRef = useRef<number>(-1)

  useEffect(() => {
    if (!enabled || !tableRef.current) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const table = tableRef.current
      if (!table) {
        return
      }

      // Only handle if focus is within the table
      if (!table.contains(document.activeElement)) {
        return
      }

      const { key } = event

      switch (key) {
        case 'ArrowDown': {
          event.preventDefault()
          currentRowRef.current = Math.min(currentRowRef.current + 1, rowCount - 1)
          focusCell(currentRowRef.current, currentColRef.current)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          currentRowRef.current = Math.max(currentRowRef.current - 1, 0)
          focusCell(currentRowRef.current, currentColRef.current)
          break
        }
        case 'ArrowRight': {
          event.preventDefault()
          currentColRef.current = Math.min(currentColRef.current + 1, columnCount - 1)
          focusCell(currentRowRef.current, currentColRef.current)
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          currentColRef.current = Math.max(currentColRef.current - 1, 0)
          focusCell(currentRowRef.current, currentColRef.current)
          break
        }
        case 'Enter': {
          event.preventDefault()
          if (onEnter && currentRowRef.current >= 0 && currentColRef.current >= 0) {
            onEnter(currentRowRef.current, currentColRef.current)
          }
          break
        }
        case 'Escape': {
          event.preventDefault()
          if (onEscape) {
            onEscape()
          }
          break
        }
        case 'Home': {
          event.preventDefault()
          currentRowRef.current = 0
          currentColRef.current = 0
          focusCell(0, 0)
          break
        }
        case 'End': {
          event.preventDefault()
          currentRowRef.current = rowCount - 1
          currentColRef.current = columnCount - 1
          focusCell(rowCount - 1, columnCount - 1)
          break
        }
      }
    }

    const focusCell = (row: number, col: number) => {
      const table = tableRef.current
      if (!table) {
        return
      }

      const rows = table.querySelectorAll('tbody tr')
      if (rows[row]) {
        const cells = rows[row].querySelectorAll('td, th')
        const cell = cells[col]
        if (!(cell instanceof HTMLElement)) {
          return
        }
        if (cell) {
          // Find focusable element within cell
          const focusable = cell.querySelector<HTMLElement>(
            'button, a, input, [tabindex]:not([tabindex="-1"])'
          )
          if (focusable) {
            focusable.focus()
          } else if (cell.tabIndex >= 0) {
            cell.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, rowCount, columnCount, onEnter, onEscape])

  return {
    tableRef,
    setCurrentRow: (row: number) => {
      currentRowRef.current = row
    },
    setCurrentCol: (col: number) => {
      currentColRef.current = col
    },
  }
}
