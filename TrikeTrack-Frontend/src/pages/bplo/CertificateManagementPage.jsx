import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import applicationService, { fetchCertificateBlob, saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

const TYPE_OPTIONS = [
  { value: '', label: 'All certificate types' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'change_motor', label: 'Change motor' },
]

export default function CertificateManagementPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await applicationService.bplo.certificates({
        q: search || undefined,
        type: type || undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Certificates could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, type, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  const download = async (certificate) => {
    setDownloading(certificate.id)

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
        title="Certificate management"
        text="Search issued certificates and download PDFs. Certificates are issued from approved applications in the review screen."
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search certificate, application, franchise, or franchisee"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search certificates"
          />

          <select
            className="field__input toolbar__select"
            value={type}
            onChange={(event) => {
              setPage(1)
              setType(event.target.value)
            }}
            aria-label="Filter by certificate type"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          emptyMessage="No certificates have been issued yet."
          columns={[
            {
              key: 'certificate_number',
              label: 'Certificate',
              render: (row) => (
                <div className="cell-stack">
                  <strong>{row.certificate_number}</strong>
                  <small className="text-muted">{humanizeStatus(row.type)}</small>
                </div>
              ),
            },
            {
              key: 'application',
              label: 'Application',
              render: (row) => (
                <div className="cell-stack">
                  <span>{row.application?.reference_number || '-'}</span>
                  <small className="text-muted">{row.application?.franchise?.franchise_number || ''}</small>
                </div>
              ),
            },
            {
              key: 'franchisee',
              label: 'Franchisee',
              render: (row) => row.application?.franchisee?.full_name || '-',
            },
            { key: 'issued_at', label: 'Issued', render: (row) => formatDate(row.issued_at) },
            { key: 'issued_by', label: 'Issued by', render: (row) => row.issued_by || '-' },
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
                  PDF
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
