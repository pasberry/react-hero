import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Runs after each test
afterEach(() => {
  cleanup()
})
