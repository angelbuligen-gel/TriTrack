import api from './api'

const authService = {
  register(payload) {
    return api.post('/auth/register', payload).then((response) => response.data)
  },

  verifyOtp(payload) {
    return api.post('/auth/verify-otp', payload).then((response) => response.data)
  },

  resendOtp(payload) {
    return api.post('/auth/resend-otp', payload).then((response) => response.data)
  },

  login(payload) {
    return api.post('/auth/login', payload).then((response) => response.data)
  },

  logout() {
    return api.post('/auth/logout')
  },

  me() {
    return api.get('/auth/me').then((response) => response.data.data)
  },
}

export default authService
