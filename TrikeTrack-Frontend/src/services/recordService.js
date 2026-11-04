import api from './api'

async function list(url, params) {
  const response = await api.get(url, { params })

  return {
    items: response.data.data ?? [],
    meta: response.data.meta ?? null,
    message: response.data.message,
  }
}

async function get(url) {
  const response = await api.get(url)
  return response.data.data
}

const recordService = {
  franchisees: {
    list: (params) => list('/bplo/franchisees', params),
    get: (id) => get(`/bplo/franchisees/${id}`),
    create: (payload) => api.post('/bplo/franchisees', payload).then((r) => r.data),
    update: (id, payload) => api.put(`/bplo/franchisees/${id}`, payload).then((r) => r.data),
    unlinkedAccounts: (params) => list('/bplo/franchisee-accounts', params),
    linkAccount: (id, userId) =>
      api.post(`/bplo/franchisees/${id}/link-account`, { user_id: userId }).then((r) => r.data),
    unlinkAccount: (id) =>
      api.delete(`/bplo/franchisees/${id}/link-account`).then((r) => r.data),
  },

  franchises: {
    list: (params) => list('/bplo/franchises', params),
    get: (id) => get(`/bplo/franchises/${id}`),
    create: (payload) => api.post('/bplo/franchises', payload).then((r) => r.data),
    update: (id, payload) => api.put(`/bplo/franchises/${id}`, payload).then((r) => r.data),
    assignDriver: (id, payload) =>
      api.post(`/bplo/franchises/${id}/drivers`, payload).then((r) => r.data),
    endDriverAssignment: (id, assignmentId) =>
      api.delete(`/bplo/franchises/${id}/drivers/${assignmentId}`).then((r) => r.data),
    assignVehicle: (id, payload) =>
      api.post(`/bplo/franchises/${id}/vehicles`, payload).then((r) => r.data),
    endVehicleAssignment: (id, assignmentId) =>
      api.delete(`/bplo/franchises/${id}/vehicles/${assignmentId}`).then((r) => r.data),
  },

  drivers: {
    list: (params) => list('/bplo/drivers', params),
    get: (id) => get(`/bplo/drivers/${id}`),
    create: (payload) => api.post('/bplo/drivers', payload).then((r) => r.data),
    update: (id, payload) => api.put(`/bplo/drivers/${id}`, payload).then((r) => r.data),
  },

  vehicles: {
    list: (params) => list('/bplo/vehicles', params),
    get: (id) => get(`/bplo/vehicles/${id}`),
    create: (payload) => api.post('/bplo/vehicles', payload).then((r) => r.data),
    update: (id, payload) => api.put(`/bplo/vehicles/${id}`, payload).then((r) => r.data),
  },

  mine: {
    profile: () => get('/my/profile'),
    franchise: () => api.get('/my/franchise').then((r) => r.data.data ?? []),
    drivers: () => api.get('/my/drivers').then((r) => r.data.data ?? []),
    vehicles: () => api.get('/my/vehicles').then((r) => r.data.data ?? []),
  },
}

export default recordService
