import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  getSession,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true

    getSession()
      .then((sesion) => {
        if (activo) setUser(sesion)
      })
      .catch(() => {
        if (activo) setUser(null)
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    const cerrarSesion = () => setUser(null)
    window.addEventListener('auth:unauthorized', cerrarSesion)
    return () => window.removeEventListener('auth:unauthorized', cerrarSesion)
  }, [])

  const login = useCallback(async (usuario, password) => {
    const sesion = await apiLogin(usuario, password)
    setUser(sesion)
    return sesion
  }, [])

  const register = useCallback(async (datos) => {
    const sesion = await apiRegister(datos)
    setUser(sesion)
    return sesion
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
