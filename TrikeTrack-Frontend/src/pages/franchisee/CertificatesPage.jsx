import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import accountService from '../../services/accountService'
import { fetchCertificateBlob, saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

export default function CertificatesPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await accountService.certificates.list({ page, per_page: 10 })
      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Your certificates could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const download = async (certificate) => {
    setDownloading(certificate.id)
    setError('')

    try {
      const blob = await fetchCertificateBlob(certificate)
      saveBlob(blob, `${certificate.certificate_number}.pdf`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The certificate could not be downloaded.'))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Certificates"
        title="My certificates"
        text="Download the certificate issued for each approved renewal, transfer, or motor change."
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <DataTable
          loading={loading}
          rows={rows}
          emptyMessage="No certificate has been issued to your account yet."
          columns={[
            { key: 'certificate_number', label: 'Certificate no.' },
            {
              key: 'type',
              label: 'Type',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.type_label}</span>
                  <small className="text-muted">{row.application?.reference_number || ''}</small>
                </div>
              ),
            },
            {
              key: 'franchise',
              label: 'Franchise',
              render: (row) => row.application?.franchise?.franchise_number || '-',
            },
            { key: 'issued_at', label: 'Issued', render: (row) => formatDate(row.issued_at) },
            {
              key: 'validity',
              label: 'Validity',
              render: (row) => (
                <span className="text-muted">
                  {row.metadata?.valid_from ? formatDate(row.metadata.valid_from) : '-'} to{' '}
                  {row.metadata?.valid_until ? formatDate(row.metadata.valid_until) : 'until revoked'}
                </span>
              ),
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <Button
                  variant="secondary"
                  loading={downloading === row.id}
                  onClick={() => download(row)}
                >
                  Download PDF
                </Button>
              ),
            },
          ]}
        />

        {meta && meta.last_page > 1 ? (
          <div className="pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.current_page} of {meta.last_page} ({meta.total} certificate(s))
            </span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>
    </>
  )
}
