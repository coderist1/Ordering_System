import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

const FALLBACK_LAN_HOST = '192.168.254.121:8000'
const FALLBACK_RELEASE_API_URL = 'https://ordering-system-15kz.onrender.com/api/v1'

const normalizeApiBaseUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/$/, '')
  if (trimmed.endsWith('/api/v1')) return trimmed
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`
  return `${trimmed}/api/v1`
}

const resolveApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (envUrl) {
    return normalizeApiBaseUrl(envUrl)
  }

  if (Platform.OS === 'web') {
    return '/api/v1'
  }

  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri
  if (hostUri) {
    const host = hostUri.split(':')[0]
    return `http://${host}:8000/api/v1`
  }

  // Development only: emulator / LAN fallbacks (Expo Go, dev builds)
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api/v1'
    }
    return `http://${FALLBACK_LAN_HOST}/api/v1`
  }

  // Production standalone APK / release build: use deployed backend
  return FALLBACK_RELEASE_API_URL
}

const API_BASE_URL = resolveApiBaseUrl()
const API_ROOT_URL = API_BASE_URL.replace(/\/api(?:\/v1)?$/, '') || '/'

let refreshPromise: Promise<string> | null = null

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

const refreshApi = axios.create({
  baseURL: API_ROOT_URL,
  timeout: 15000,
})

// Helper function to get token based on platform
const getToken = async () => {
  if (Platform.OS === 'web') {
    // For web, use localStorage
    return localStorage.getItem('access_token')
  } else {
    // For native, use SecureStore
    return await SecureStore.getItemAsync('access_token')
  }
}

// Helper function to delete tokens based on platform
const deleteTokens = async () => {
  if (Platform.OS === 'web') {
    // For web, use localStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  } else {
    // For native, use SecureStore
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('user')
  }
}

const getRefreshToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('refresh_token')
  }
  return await SecureStore.getItemAsync('refresh_token')
}

const saveAccessToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('access_token', token)
  } else {
    await SecureStore.setItemAsync('access_token', token)
  }
}

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        throw new Error('Missing refresh token')
      }

      const response = await refreshApi.post('/api/token/refresh/', {
        refresh: refreshToken,
      })

      const newAccess = response.data?.access
      if (!newAccess) {
        throw new Error('Missing access token in refresh response')
      }

      await saveAccessToken(newAccess)
      return newAccess
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

const isAuthEndpoint = (url?: string) => {
  if (!url) return false
  return (
    url.includes('/auth/login/') ||
    url.includes('/auth/register/') ||
    url.includes('/auth/logout/') ||
    url.includes('/auth/me/') ||
    url.includes('/api/token/refresh/')
  )
}

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalConfig = err.config || {}

    if (err.response?.status === 401 && !originalConfig._retry && !isAuthEndpoint(originalConfig.url)) {
      originalConfig._retry = true

      try {
        const newAccess = await refreshAccessToken()
        originalConfig.headers = originalConfig.headers || {}
        originalConfig.headers.Authorization = `Bearer ${newAccess}`
        return api(originalConfig)
      } catch (refreshErr) {
        await deleteTokens()
        return Promise.reject(refreshErr)
      }
    }

    if (err.response?.status === 401) {
      await deleteTokens()
    }
    return Promise.reject(err)
  }
)

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export const register = (data: any) => {
  return api.post('/auth/register/', data)
}
export const activateAccount = (uid: string, token: string) => api.post(`/auth/activate/${uid}/${token}/`)
// Auth endpoints in backend are mounted under /api/v1/auth/*
export const login = (data: any) => api.post('/auth/login/', data)
export const requestPasswordReset = (email: string) => api.post('/auth/request-reset/', { email })
export const confirmPasswordReset = (userId: string | number, token: string, payload: { new_password: string; confirm_password: string }) => {
  return api.post(`/auth/reset-password/${userId}/${token}/`, payload)
}


export const logout = (refresh: string) => api.post('/auth/logout/', { refresh })
export const fetchMe = () => api.get('/auth/me/')

// Normalize user data - extract role from profile
export const normalizeUser = (payload: any) => {
  const raw = payload?.user ? payload.user : payload
  const role = raw?.profile?.role || raw?.role || 'user'
  return { ...raw, role, profile: raw?.profile || null }
}

export const updateProfile = (data: any) => {
  return api.put('/auth/me/', data)
}

export const fetchProducts = (params = {}) => api.get('/products/', { params })
export const fetchProduct = (id: number) => api.get(`/products/${id}/`)
export const createProduct = (data: any) => {
  // If FormData (contains image), send as multipart
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return api.post('/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
  return api.post('/products/', data)
}

export const updateProduct = (id: number, data: any) => {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return api.patch(`/products/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
  return api.patch(`/products/${id}/`, data)
}
export const deleteProduct = (id: number) => api.delete(`/products/${id}/`)

export const fetchOrders = (params = {}) => api.get('/orders/', { params })
export const fetchOrder = (id: number) => api.get(`/orders/${id}/`)
export const createOrder = (data: any) => api.post('/orders/', data)
export const updateStatus = (id: number, status: string, note = '') => api.post(`/orders/${id}/status/`, { status, note })
export const deleteOrder = (id: number) => api.delete(`/orders/${id}/`)
export const updateNotes = (id: number, notes: string) => api.patch(`/orders/${id}/`, { notes })
export const cancelOrder = (id: number) => api.post(`/orders/${id}/cancel/`)

export const fetchSummary = () => api.get('/orders/summary/')
export const fetchCustomers = () => api.get('/customers/')
export const fetchUsers = () => api.get('/users/')
export const updateUserRole = (userId: number, role: string) => api.patch(`/users/${userId}/role/`, { role })

export const fetchNotifications = () => api.get('/notifications/')
export const submitReview = (orderId: number, data: any) => api.post(`/orders/${orderId}/review/`, data)

export const createOwnerApplication = (data: any) => api.post('/owner-applications/create/', data)
export const fetchOwnerApplications = () => api.get('/owner-applications/')
export const fetchOwnerApplication = (id: number) => api.get(`/owner-applications/${id}/`)
export const reviewOwnerApplication = (id: number, data: any) => api.post(`/owner-applications/${id}/review/`, data)

export const sendChatMessage = (message: string) => api.post('/chatbot/', { message })
export const fetchChatbotInfo = () => api.get('/chatbot/info/')

// Upload profile image separately
export const uploadProfileImage = (formData: FormData) => {
  return api.put('/auth/me/', formData, {
    timeout: 30000,
  })
}

// Alternative endpoint if the above doesn't work
export const uploadAvatar = (formData: FormData) => {
  return api.put('/auth/me/', formData)
}

// Update profile without image (using regular JSON)
export const updateProfileData = (data: {
  first_name?: string
  last_name?: string
  email?: string
  address?: string
}) => {
  return api.patch('/users/profile/', data)
}