import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcut } from '../use-keyboard-shortcut'

describe('useKeyboardShortcut', () => {
  let callback: (event: KeyboardEvent) => void

  beforeEach(() => {
    callback = vi.fn() as (event: KeyboardEvent) => void
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should call callback when shortcut is pressed', () => {
    renderHook(() => useKeyboardShortcut('ctrl+k', callback))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ key: 'k', ctrlKey: true }))
  })

  it('should handle space key correctly', () => {
    renderHook(() => useKeyboardShortcut('ctrl+space', callback))

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      ctrlKey: true,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not call callback when wrong key is pressed', () => {
    renderHook(() => useKeyboardShortcut('ctrl+k', callback))

    const event = new KeyboardEvent('keydown', {
      key: 'j',
      ctrlKey: true,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should not call callback when modifier is missing', () => {
    renderHook(() => useKeyboardShortcut('ctrl+k', callback))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: false,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should handle alt modifier', () => {
    renderHook(() => useKeyboardShortcut('alt+s', callback))

    const event = new KeyboardEvent('keydown', {
      key: 's',
      altKey: true,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle shift modifier', () => {
    renderHook(() => useKeyboardShortcut('shift+a', callback))

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      shiftKey: true,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not call callback when disabled', () => {
    renderHook(() => useKeyboardShortcut('ctrl+k', callback, { enabled: false }))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })

    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should prevent default when preventDefault is true', () => {
    renderHook(() => useKeyboardShortcut('ctrl+k', callback, { preventDefault: true }))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should not prevent default when preventDefault is false', () => {
    renderHook(() => useKeyboardShortcut('ctrl+k', callback, { preventDefault: false }))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })
})
