export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'rpgelsewhere.theme'

function loadStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function detectSystemTheme(): Theme {
  if (
    typeof window !== 'undefined' &&
    'matchMedia' in window &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

export function getInitialTheme(): Theme {
  return loadStoredTheme() ?? detectSystemTheme()
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore storage errors so the app still works
  }
}
