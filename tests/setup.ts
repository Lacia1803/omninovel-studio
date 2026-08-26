import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Web Animations API for jsdom
// See: https://github.com/vitest-dev/vitest/issues/1682
Object.defineProperty(window, 'scroll', {
  value: () => {},
  writable: false,
})

// Mock ResizeObserver for jsdom
class ResizeObserver {
  callback: globalThis.ResizeObserverCallback
  constructor(callback: globalThis.ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {
    // Do nothing
  }
  unobserve() {
    // Do nothing
  }
  disconnect() {
    // Do nothing
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserver)
