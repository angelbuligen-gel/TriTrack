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

/**
 * Fetch a stored document as a blob. The API requires the bearer token,
 * so documents cannot be linked to directly from the browser.
 */
export async function fetchDocumentBlob(document, { download = false } = {}) {
  const response = await api.get(document.file_url, {
    responseType: 'blob',
    params: download ? { download: 1 } : undefined,
  })

  return response.data
}

export async function fetchCertificateBlob(certificate) {
  const response = await api.get(certificate.download_url, { responseType: 'blob' })

  return response.data
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')

  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

const applicationService = {
  mine: {
    list: (params) => list('/my/applications', params),
    get: (id) => api.get(`/my/applications/${id}`).then(unwrap),
    renewalOptions: () => api.get('/my/renewal-options').then(unwrap),
    fileRenewal: (payload) => api.post('/my/applications/renewal', payload).then(unwrap),
    transferOptions: () => api.get('/my/transfer-options').then(unwrap),
    fileTransfer: (payload) => api.post('/my/applications/transfer', payload).then(unwrap),
    changeMotorOptions: () => api.get('/my/change-motor-options').then(unwrap),
    fileChangeMotor: (payload) => api.post('/my/applications/change-motor', payload).then(unwrap),
    uploadDocument: (id, requirementCode, file) => {
      const form = new FormData()
      form.append('requirement_code', requirementCode)
      form.append('file', file)

      return api.post(`/my/applications/${id}/documents`, form).then(unwrap)
    },
    documents: (params) => list('/my/documents', params),
  },

  bplo: {
    list: (params) => list('/bplo/applications', params),
    get: (id) => api.get(`/bplo/applications/${id}`).then(unwrap),
    stats: () => api.get('/bplo/applications/stats').then(unwrap),
    startReview: (id, remarks) =>
      api.post(`/bplo/applications/${id}/start-review`, { remarks }).then(unwrap),
    requestCorrection: (id, remarks) =>
      api.post(`/bplo/applications/${id}/request-correction`, { remarks }).then(unwrap),
    decide: (id, decision, remarks) =>
      api.post(`/bplo/applications/${id}/decision`, { decision, remarks }).then(unwrap),
    documents: (params) => list('/bplo/documents', params),
    reviewDocument: (id, reviewStatus, reviewRemarks) =>
      api
        .post(`/bplo/documents/${id}/review`, {
          review_status: reviewStatus,
          review_remarks: reviewRemarks,
        })
        .then(unwrap),
    extractDocument: (id) => api.post(`/bplo/documents/${id}/extract`).then(unwrap),
    confirmExtraction: (id, extractedData, remarks) =>
      api
        .post(`/bplo/documents/${id}/confirm-extraction`, {
          extracted_data: extractedData,
          remarks,
        })
        .then(unwrap),
    certificates: (params) => list('/bplo/certificates', params),
    issueCertificate: (applicationId) =>
      api.post(`/bplo/applications/${applicationId}/certificate`).then(unwrap),
    reportSummary: (params) => api.get('/bplo/reports/summary', { params }).then(unwrap),
    reportApplications: (params) => list('/bplo/reports/applications', params),
  },
}

export default applicationService
