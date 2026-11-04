import axios from 'axios'

export const TOKEN_KEY = 'tritrack_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // Expired or revoked token: let the auth context clean up and redirect.
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('tritrack:unauthorized'))
    }

    return Promise.reject(error)
  },
)

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the TrikeTrack API. Please check that the backend is running.'
  }

  return fallback
}

/**
 * Flatten Laravel's { errors: { field: [messages] } } payload into
 * { field: 'first message' } for simple form display.
 */
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors

  if (!errors) {
    return {}
  }

  return Object.entries(errors).reduce((acc, [field, messages]) => {
    acc[field] = Array.isArray(messages) ? messages[0] : String(messages)
    return acc
  }, {})
}

export function getErrorCode(error) {
  const code = error?.response?.data?.errors?.code

  return Array.isArray(code) ? code[0] : code || null
}

export default api
