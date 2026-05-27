import axios from 'axios'

const normalizeBaseUrl = (value, fallback) => {
  if (!value) return fallback
  return value.replace(/\/$/, '')
}

const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, '/api/v1')
const API_BASE_URL = configuredBaseUrl
const REFRESH_BASE_URL = API_BASE_URL.endsWith('/api/v1')
  ? API_BASE_URL.replace(/\/api\/v1$/, '') || '/'
  : API_BASE_URL

const API = axios.create({ baseURL: API_BASE_URL })
const REFRESH_API = axios.create({ baseURL: REFRESH_BASE_URL })

let refreshPromise = null

const clearAuthState = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

const refreshAccessToken = async () => {
  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) {
    throw new Error('Missing refresh token')
  }

  const res = await REFRESH_API.post('/api/token/refresh/', { refresh })
  const access = res.data?.access
  if (!access) {
    throw new Error('Missing refreshed access token')
  }

  localStorage.setItem('access_token', access)
  return access
}

const queueTokenRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}


API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const status = err.response?.status

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login/')
      || originalRequest?.url?.includes('/auth/register/')
      || originalRequest?.url?.includes('/api/token/refresh/')

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      try {
        const access = await queueTokenRefresh()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${access}`
        return API(originalRequest)
      } catch (refreshError) {
        clearAuthState()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    if (status === 401) {
      clearAuthState()
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

// Auth
export const register = (data) => API.post('/auth/register/', data)
export const activateAccount = (uid, token) => API.post(`/auth/activate/${uid}/${token}/`)
export const login    = (data) => API.post('/auth/login/', data)
export const requestPasswordReset = (email) => API.post('/auth/request-reset/', { email })
export const confirmPasswordReset = (userId, token, payload) => API.post(`/auth/reset-password/${userId}/${token}/`, payload)
export const logout   = ()     => {
  const refresh = localStorage.getItem('refresh_token')
  return API.post('/auth/logout/', { refresh })
}
export const fetchMe  = ()     => API.get('/auth/me/')
export const updateProfile = (data) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  // When sending FormData, omit Content-Type header so browser sets it with correct boundary
  const config = isFormData ? {} : {}
  return API.put('/auth/me/', data, config)
}

// Products
const productRequestConfig = (data) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  return isFormData ? {} : undefined
}

export const fetchProducts = (params = {}) => API.get('/products/', { params })
export const fetchProduct  = (id)          => API.get(`/products/${id}/`)
export const createProduct = (data)        => API.post('/products/', data, productRequestConfig(data))
export const updateProduct = (id, data)    => API.patch(`/products/${id}/`, data, productRequestConfig(data))
export const deleteProduct = (id)          => API.delete(`/products/${id}/`)

// Orders
export const fetchOrders  = (params = {}) => API.get('/orders/', { params })
export const fetchOrder   = (id)          => API.get(`/orders/${id}/`)
export const createOrder  = (data)        => API.post('/orders/', data)
export const updateStatus = (id, status, note = '') => API.post(`/orders/${id}/status/`, { status, note })
export const deleteOrder  = (id)          => API.delete(`/orders/${id}/`)
export const updateNotes  = (id, notes)   => API.patch(`/orders/${id}/`, { notes })
export const cancelOrder  = (id)          => API.post(`/orders/${id}/cancel/`)

// Summary & Lists
export const fetchSummary   = ()  => API.get('/orders/summary/')
export const fetchCustomers = ()  => API.get('/customers/')
export const fetchUsers     = ()  => API.get('/users/')

// Admin: update user role
export const updateUserRole = (userId, role) => API.patch(`/users/${userId}/role/`, { role })

// Notifications & Reviews
export const fetchNotifications = () => API.get('/notifications/')
export const submitReview = (orderId, data) => API.post(`/orders/${orderId}/review/`, data)

// Owner Applications
export const createOwnerApplication = (data) => API.post('/owner-applications/create/', data)
export const fetchOwnerApplications = () => API.get('/owner-applications/')
export const fetchOwnerApplication = (id) => API.get(`/owner-applications/${id}/`)
export const reviewOwnerApplication = (id, data) => API.post(`/owner-applications/${id}/review/`, data)

// Chatbot
export const sendChatMessage = (message) => API.post('/chat/', { message })
export const sendPublicChatMessage = (message) => API.post('/chat/public/', { message })
export const fetchChatbotInfo = () => API.get('/knowledge/')