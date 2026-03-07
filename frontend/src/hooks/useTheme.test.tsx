import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from '../theme'
import { useTheme } from './useTheme'

function ThemeHarness() {
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <span>{theme}</span>
      <button type="button" onClick={toggleTheme}>
        toggle theme
      </button>
    </>
  )
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  })
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
    mockMatchMedia(false)
  })

  it('falls back to the system theme when nothing is stored', () => {
    mockMatchMedia(true)

    render(<ThemeHarness />)

    expect(screen.getByText('dark')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('uses the stored theme preference on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    mockMatchMedia(true)

    render(<ThemeHarness />)

    expect(screen.getByText('light')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('toggles the theme and persists the new preference', () => {
    render(<ThemeHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'toggle theme' }))

    expect(screen.getByText('dark')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})
