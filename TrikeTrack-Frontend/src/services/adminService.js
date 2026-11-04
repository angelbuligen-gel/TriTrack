import api from './api'

const unwrap = (response) => response.data.data

async function list(url, params) {
  const response = await api.get(url, { params })

  return {
    items: response.data.data ?? [],
    meta: response.data.meta ?? null,
    message: response.data.message,
  }
}

const adminService = {
  users: {
    list: (params) => list('/admin/users', params),
    get: (id) => api.get(`/admin/users/${id}`).then(unwrap),
    create: (payload) => api.post('/admin/users', payload).then(unwrap),
    update: (id, payload) => api.put(`/admin/users/${id}`, payload).then(unwrap),
    updateStatus: (id, accountStatus) =>
      api.patch(`/admin/users/${id}/status`, { account_status: accountStatus }).then(unwrap),
    resetPassword: (id, payload = {}) =>
      api.post(`/admin/users/${id}/reset-password`, payload).then(unwrap),
  },

  activityLogs: (params) => list('/admin/activity-logs', params),
  settings: () => api.get('/admin/settings').then(unwrap),
  updateSettings: (settings) => api.put('/admin/settings', { settings }).then(unwrap),
  monitoring: () => api.get('/admin/monitoring').then(unwrap),
}

export default adminService
