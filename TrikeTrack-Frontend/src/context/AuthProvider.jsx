import { useCallback, useEffect, useMemo, useState } from 'react'

import authService from '../services/authService'
import { TOKEN_KEY } from '../services/api'
import AuthContext from './AuthContext'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initialising, setInitialising] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      return
    }

    let active = true

    authService
      .me()
      .then((profile) => {
        if (active) {
          setUser(profile)
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)

        if (active) {
          setUser(null)
        }
      })
      .finally(() => {
        if (active) {
          setInitialising(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }

    window.addEventListener('tritrack:unauthorized', handleUnauthorized)

    return () => window.removeEventListener('tritrack:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials)
    const { token, user: profile } = response.data

    localStorage.setItem(TOKEN_KEY, token)
    setUser(profile)

    return profile
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Token may already be invalid; local cleanup is what matters.
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      initialising,
      isAuthenticated: Boolean(user),
      login,
      logout,
      setUser,
    }),
    [user, initialising, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
