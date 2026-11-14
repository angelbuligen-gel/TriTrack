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

const treasuryService = {
  dashboard: () => api.get('/treasury/dashboard').then(unwrap),
  feeTypes: () => api.get('/treasury/fee-types').then(unwrap),

  applications: {
    list: (params) => list('/treasury/applications', params),
    get: (id) => api.get(`/treasury/applications/${id}`).then(unwrap),
    feeTypes: (id) => api.get(`/treasury/applications/${id}/fee-types`).then(unwrap),
    assess: (id, payload) => api.post(`/treasury/applications/${id}/assessment`, payload).then(unwrap),
  },

  assessments: {
    list: (params) => list('/treasury/assessments', params),
    get: (id) => api.get(`/treasury/assessments/${id}`).then(unwrap),
    cancel: (id) => api.delete(`/treasury/assessments/${id}`).then(unwrap),
  },

  payments: {
    list: (params) => list('/treasury/payments', params),
    get: (id) => api.get(`/treasury/payments/${id}`).then(unwrap),
    verify: (id, payload) => api.post(`/treasury/payments/${id}/verify`, payload).then(unwrap),
    receipt: (id) =>
      api.get(`/payments/${id}/receipt`, { responseType: 'blob' }).then((response) => response.data),
    report: (params) => api.get('/treasury/reports/collections', { params }).then(unwrap),
    reportPdf: (params) =>
      api
        .get('/treasury/reports/collections/pdf', { params, responseType: 'blob' })
        .then((response) => response.data),
    reportExcel: (params) =>
      api
        .get('/treasury/reports/collections/excel', { params, responseType: 'blob' })
        .then((response) => response.data),
  },
}

export default treasuryService
