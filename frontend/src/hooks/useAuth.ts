import { useCallback, useEffect, useState } from 'react'
import { checkAuth, login as apiLogin } from '../api/auth'

const SESSION_KEY = 'admin_token'

interface UseAuthResult {
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (password: string) => Promise<void>
  logout: () => void
}

export function useAuth(): UseAuthResult {
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    const verify = stored
      ? checkAuth(stored).then(valid => {
          if (valid) {
            setToken(stored)
            setIsAuthenticated(true)
          } else {
            sessionStorage.removeItem(SESSION_KEY)
          }
        })
      : Promise.resolve()

    verify.finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (password: string) => {
    const newToken = await apiLogin(password)
    sessionStorage.setItem(SESSION_KEY, newToken)
    setToken(newToken)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setToken(null)
    setIsAuthenticated(false)
  }, [])

  return { token, isAuthenticated, loading, login, logout }
}
