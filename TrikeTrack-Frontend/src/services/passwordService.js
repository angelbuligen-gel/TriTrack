import api from './api'

const passwordService = {
  request: (identifier) => api.post('/auth/forgot-password', { identifier }),
  reset: (payload) => api.post('/auth/reset-password', payload),
}

export default passwordService
