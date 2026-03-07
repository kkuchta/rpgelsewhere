import { useEffect, useState } from 'react'
import { applyTheme, getInitialTheme, persistTheme, type Theme } from '../theme'

interface UseThemeResult {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(nextTheme: Theme) {
    persistTheme(nextTheme)
    setThemeState(nextTheme)
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  }
}
