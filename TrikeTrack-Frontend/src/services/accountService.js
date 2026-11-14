import api from './api'

const unwrap = (response) => response.data.data

const accountService = {
  profile: () => api.get('/profile').then(unwrap),
  updateProfile: (payload) => api.put('/profile', payload).then(unwrap),
  changePassword: (payload) => api.put('/profile/password', payload),

  notifications: {
    list: async (params) => {
      const response = await api.get('/notifications', { params })

      return {
        items: response.data.data ?? [],
        meta: response.data.meta ?? null,
        message: response.data.message,
      }
    },
    markRead: (id) => api.post(`/notifications/${id}/read`).then(unwrap),
    markAllRead: () => api.post('/notifications/read-all').then(unwrap),
  },

  franchises: () => api.get('/my/franchise').then(unwrap),

  drivers: {
    list: async () => {
      const response = await api.get('/my/drivers')

      return response.data.data ?? []
    },
    add: (payload) => api.post('/my/drivers', payload).then(unwrap),
    update: (id, payload) => api.put(`/my/drivers/${id}`, payload).then(unwrap),
    archive: (id) => api.delete(`/my/drivers/${id}`).then(unwrap),
  },

  payments: {
    receipt: (id) =>
      api.get(`/payments/${id}/receipt`, { responseType: 'blob' }).then((response) => response.data),
    list: async (params) => {
      const response = await api.get('/my/payments', { params })

      return {
        items: response.data.data ?? [],
        meta: response.data.meta ?? null,
        message: response.data.message,
      }
    },
    get: (id) => api.get(`/my/payments/${id}`).then(unwrap),
    initiate: (payload) => api.post('/my/payments/initiate', payload).then(unwrap),
  },

  certificates: {
    list: async (params) => {
      const response = await api.get('/my/certificates', { params })

      return {
        items: response.data.data ?? [],
        meta: response.data.meta ?? null,
        message: response.data.message,
      }
    },
  },
}

export default accountService
