import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  window.history.pushState({}, '', '/')
})

afterAll(() => {
  server.close()
})
