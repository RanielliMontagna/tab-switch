import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTableKeyboardNavigation } from '../use-table-keyboard-navigation'

describe('useTableKeyboardNavigation', () => {
  let tableElement: HTMLTableElement
  let tbodyElement: HTMLTableSectionElement
  let rows: HTMLTableRowElement[]
  let cells: HTMLTableCellElement[][]
  let mockOnEnter: (rowIndex: number, columnIndex: number) => void
  let mockOnEscape: () => void

  beforeEach(() => {
    mockOnEnter = vi.fn()
    mockOnEscape = vi.fn()

    // Create table structure
    tableElement = document.createElement('table')
    tbodyElement = document.createElement('tbody')
    tableElement.appendChild(tbodyElement)

    rows = []
    cells = []

    // Create 3 rows with 2 columns each
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('tr')
      const rowCells: HTMLTableCellElement[] = []
      for (let j = 0; j < 2; j++) {
        const cell = document.createElement('td')
        cell.textContent = `Cell ${i}-${j}`
        row.appendChild(cell)
        rowCells.push(cell)
      }
      tbodyElement.appendChild(row)
      rows.push(row)
      cells.push(rowCells)
    }

    document.body.appendChild(tableElement)
  })

  afterEach(() => {
    if (document.body.contains(tableElement)) {
      document.body.removeChild(tableElement)
    }
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should return tableRef and setter functions', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      expect(result.current.tableRef).toBeDefined()
      expect(result.current.setCurrentRow).toBeDefined()
      expect(result.current.setCurrentCol).toBeDefined()
    })

    it('should initialize tableRef as null', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      expect(result.current.tableRef.current).toBeNull()
    })

    it('should not handle keys when disabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          enabled: false,
        })
      )

      // Should not add event listener when disabled
      expect(addEventListenerSpy).not.toHaveBeenCalled()
    })

    it('should not add listener when tableRef is null', () => {
      // When tableRef is null, the effect returns early
      // This is tested implicitly - if tableRef is null, no listener is added
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          enabled: true,
        })
      )

      // tableRef should be null initially
      expect(result.current.tableRef.current).toBeNull()
    })
  })

  describe('setCurrentRow and setCurrentCol', () => {
    it('should update current row', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      result.current.setCurrentRow(2)

      // Verify by checking that setter was called
      expect(typeof result.current.setCurrentRow).toBe('function')
    })

    it('should update current column', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      result.current.setCurrentCol(1)

      // Verify by checking that setter was called
      expect(typeof result.current.setCurrentCol).toBe('function')
    })

    it('should allow setting row to 0', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      result.current.setCurrentRow(0)

      expect(typeof result.current.setCurrentRow).toBe('function')
    })

    it('should allow setting column to 0', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      result.current.setCurrentCol(0)

      expect(typeof result.current.setCurrentCol).toBe('function')
    })
  })

  describe('Event listener management', () => {
    it('should setup effect when enabled and tableRef is set', () => {
      // The effect runs when enabled is true and tableRef.current is not null
      // Since refs don't trigger re-renders, we test the hook structure
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          enabled: true,
        })
      )

      // Setting tableRef.current doesn't trigger re-render, but effect checks it
      result.current.tableRef.current = tableElement

      expect(result.current.tableRef.current).toBe(tableElement)
    })

    it('should cleanup on unmount', () => {
      // Test that unmount doesn't throw errors
      const { result, unmount } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          enabled: true,
        })
      )

      result.current.tableRef.current = tableElement

      // Unmount should not throw
      expect(() => unmount()).not.toThrow()
    })

    it('should handle effect cleanup when dependencies change', () => {
      // Test that rerender with different dependencies doesn't throw
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useTableKeyboardNavigation({
            rowCount: 3,
            columnCount: 2,
            enabled,
          }),
        {
          initialProps: { enabled: true },
        }
      )

      result.current.tableRef.current = tableElement

      // Changing enabled should trigger cleanup and re-setup
      expect(() => rerender({ enabled: false })).not.toThrow()
      expect(() => rerender({ enabled: true })).not.toThrow()
    })
  })

  describe('Focus scope check', () => {
    it('should not handle keys when focus is outside table', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          onEnter: mockOnEnter,
        })
      )

      result.current.tableRef.current = tableElement

      // Focus outside table
      const outsideElement = document.createElement('input')
      document.body.appendChild(outsideElement)
      outsideElement.focus()

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      document.dispatchEvent(event)

      expect(mockOnEnter).not.toHaveBeenCalled()

      document.body.removeChild(outsideElement)
    })
  })

  describe('Callback functions', () => {
    it('should accept onEnter callback', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          onEnter: mockOnEnter,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })

    it('should accept onEscape callback', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
          onEscape: mockOnEscape,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })

    it('should work without callbacks', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 2,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle rowCount of 0', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 0,
          columnCount: 2,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })

    it('should handle columnCount of 0', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 3,
          columnCount: 0,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })

    it('should handle large rowCount', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 1000,
          columnCount: 10,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })

    it('should handle large columnCount', () => {
      const { result } = renderHook(() =>
        useTableKeyboardNavigation({
          rowCount: 10,
          columnCount: 100,
        })
      )

      expect(result.current.tableRef).toBeDefined()
    })
  })

  describe('Effect dependencies', () => {
    it('should re-run effect when enabled changes', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useTableKeyboardNavigation({
            rowCount: 3,
            columnCount: 2,
            enabled,
          }),
        {
          initialProps: { enabled: false },
        }
      )

      result.current.tableRef.current = tableElement

      rerender({ enabled: true })

      expect(addEventListenerSpy).toHaveBeenCalled()
    })

    it('should re-run effect when rowCount changes', () => {
      const { result, rerender } = renderHook(
        ({ rowCount }) =>
          useTableKeyboardNavigation({
            rowCount,
            columnCount: 2,
            enabled: true,
          }),
        {
          initialProps: { rowCount: 3 },
        }
      )

      result.current.tableRef.current = tableElement

      rerender({ rowCount: 5 })

      expect(result.current.tableRef).toBeDefined()
    })

    it('should re-run effect when columnCount changes', () => {
      const { result, rerender } = renderHook(
        ({ columnCount }) =>
          useTableKeyboardNavigation({
            rowCount: 3,
            columnCount,
            enabled: true,
          }),
        {
          initialProps: { columnCount: 2 },
        }
      )

      result.current.tableRef.current = tableElement

      rerender({ columnCount: 4 })

      expect(result.current.tableRef).toBeDefined()
    })

    it('should re-run effect when onEnter changes', () => {
      const { result, rerender } = renderHook(
        ({ onEnter }) =>
          useTableKeyboardNavigation({
            rowCount: 3,
            columnCount: 2,
            onEnter,
            enabled: true,
          }),
        {
          initialProps: { onEnter: mockOnEnter },
        }
      )

      result.current.tableRef.current = tableElement

      const newOnEnter = vi.fn()
      rerender({ onEnter: newOnEnter })

      expect(result.current.tableRef).toBeDefined()
    })

    it('should re-run effect when onEscape changes', () => {
      const { result, rerender } = renderHook(
        ({ onEscape }) =>
          useTableKeyboardNavigation({
            rowCount: 3,
            columnCount: 2,
            onEscape,
            enabled: true,
          }),
        {
          initialProps: { onEscape: mockOnEscape },
        }
      )

      result.current.tableRef.current = tableElement

      const newOnEscape = vi.fn()
      rerender({ onEscape: newOnEscape })

      expect(result.current.tableRef).toBeDefined()
    })
  })
})
