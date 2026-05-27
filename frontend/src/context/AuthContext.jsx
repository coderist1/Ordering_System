import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi, logout as logoutApi, register as registerApi, updateProfile, fetchMe } from '@/api/ordersApi'

const AuthContext = createContext(null)

function normalizeRole(role) {
  if (!role || role === 'user') return 'customer'
  return role
}

function normalizeUserPayload(payload) {
  const raw = payload?.user ? payload.user : payload
  const role = normalizeRole(raw?.profile?.role || raw?.role || 'customer')
  return {
    ...raw,
    role,
    profile: raw?.profile || null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    const hasToken = Boolean(localStorage.getItem('access_token'))
    return saved && hasToken ? JSON.parse(saved) : null
  })
  const [authChecked, setAuthChecked] = useState(false)

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      refreshUser().finally(() => setAuthChecked(true))
    } else {
      if (!token && user) {
        // Clear invalid state
        setUser(null)
        localStorage.removeItem('user')
      }
      setAuthChecked(true)
    }
  }, [])

  const login = async (email, password) => {
     const res = await loginApi({ email, password })
     // Handle 403 — account not activated
     if (res.data?.detail?.includes?.('not activated')) {
       return { error: res.data.detail }
     }
     localStorage.setItem('access_token', res.data.access)
     localStorage.setItem('refresh_token', res.data.refresh)
     const userData = normalizeUserPayload(res.data)
     localStorage.setItem('user', JSON.stringify(userData))
     setUser(userData)
     return userData
   }

  const register = async (payload) => {
    const res = await registerApi(payload)
    const access = res.data?.access
    const refresh = res.data?.refresh
    if (access && refresh) {
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      const userData = normalizeUserPayload(res.data)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return userData
    }
    return res.data?.user || res.data
  }

  const logout = async () => {
    try { await logoutApi() } catch {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = async (data) => {
    const res = await updateProfile(data)
    // updateProfile may return user object or wrapped object
    const userData = normalizeUserPayload(res.data)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

   const refreshUser = useCallback(async () => {
     try {
       const token = localStorage.getItem('access_token')
       if (!token) {
         setUser(null)
         return null
       }
       const res = await fetchMe()
       const userData = normalizeUserPayload(res.data)
       localStorage.setItem('user', JSON.stringify(userData))
       setUser(userData)
       return userData
     } catch (error) {
       console.error('Failed to refresh user', error)
       // Clear invalid tokens on failure
       localStorage.removeItem('access_token')
       localStorage.removeItem('refresh_token')
       localStorage.removeItem('user')
       setUser(null)
       return null
     }
   }, [])

  return (
    <AuthContext.Provider value={{ user, authChecked, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  // During HMR or if provider is missing, return a safe shape.
  if (!ctx) {
    return {
      user: null,
      authChecked: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      updateUser: async () => {},
      refreshUser: async () => null,
    }
  }
  return ctx
}
