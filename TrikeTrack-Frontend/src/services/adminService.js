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

  feeTypes: {
    list: (params) => list('/admin/fee-types', params),
    create: (payload) => api.post('/admin/fee-types', payload).then(unwrap),
    update: (id, payload) => api.put(`/admin/fee-types/${id}`, payload).then(unwrap),
    archive: (id) => api.delete(`/admin/fee-types/${id}`).then(unwrap),
  },

  requirements: {
    list: (params) => list('/admin/document-requirements', params),
    create: (payload) => api.post('/admin/document-requirements', payload).then(unwrap),
    update: (id, payload) => api.put(`/admin/document-requirements/${id}`, payload).then(unwrap),
    remove: (id) => api.delete(`/admin/document-requirements/${id}`).then(unwrap),
  },

  templates: {
    list: () => api.get('/admin/document-templates').then(unwrap),
    update: (id, payload) => api.put(`/admin/document-templates/${id}`, payload).then(unwrap),
    uploadAsset: (id, type, file) => {
      const form = new FormData()
      form.append('type', type)
      form.append('file', file)

      return api.post(`/admin/document-templates/${id}/asset`, form).then(unwrap)
    },
    restore: (id) => api.post(`/admin/document-templates/${id}/restore`).then(unwrap),
    preview: (id) =>
      api
        .get(`/admin/document-templates/${id}/preview`, { responseType: 'blob' })
        .then((response) => response.data),
  },

  notificationTemplates: {
    list: () => api.get('/admin/notification-templates').then(unwrap),
    update: (id, payload) => api.put(`/admin/notification-templates/${id}`, payload).then(unwrap),
  },

  backups: {
    list: () => api.get('/admin/backups').then(unwrap),
    create: () => api.post('/admin/backups').then(unwrap),
    restore: (name) =>
      api.post(`/admin/backups/${encodeURIComponent(name)}/restore`, { confirm: 'RESTORE' }).then(unwrap),
    download: (name) =>
      api
        .get(`/admin/backups/${encodeURIComponent(name)}/download`, { responseType: 'blob' })
        .then((response) => response.data),
    remove: (name) => api.delete(`/admin/backups/${encodeURIComponent(name)}`).then(unwrap),
  },

  sessions: {
    list: (params) => list('/admin/sessions', params),
    terminate: (id) => api.delete(`/admin/sessions/${id}`).then(unwrap),
    terminateUser: (userId) => api.delete(`/admin/users/${userId}/sessions`).then(unwrap),
  },

  activityLogs: (params) => list('/admin/activity-logs', params),
  settings: () => api.get('/admin/settings').then(unwrap),
  updateSettings: (settings) => api.put('/admin/settings', { settings }).then(unwrap),
  monitoring: () => api.get('/admin/monitoring').then(unwrap),
}

export default adminService
