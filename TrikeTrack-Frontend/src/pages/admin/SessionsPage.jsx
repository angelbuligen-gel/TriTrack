import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

export default function SessionsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.sessions.list({
        q: search || undefined,
        page,
        per_page: 20,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Active sessions could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  const terminate = async (row) => {
    if (!window.confirm(`Terminate ${row.user?.name || 'this'}'s session (${row.name})?`)) {
      return
    }

    setBusy(`end-${row.id}`)
    setError('')

    try {
      await adminService.sessions.terminate(row.id)
      setNotice('Session terminated. The user must sign in again.')
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The session could not be terminated.'))
    } finally {
      setBusy('')
    }
  }

  const terminateAll = async (row) => {
    if (!row.user) {
      return
    }

    if (!window.confirm(`Terminate every session for ${row.user.name}?`)) {
      return
    }

    setBusy(`end-user-${row.user.id}`)
    setError('')

    try {
      await adminService.sessions.terminateUser(row.user.id)
      setNotice(`All sessions for ${row.user.name} terminated.`)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The sessions could not be terminated.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Active sessions"
        text="Every signed-in device. Terminating a session revokes its token immediately and notifies the account owner."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <div className="toolbar">
          <input
            className="field__input toolbar__search"
            type="search"
            placeholder="Search by user name or email"
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            aria-label="Search sessions"
          />
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No active sessions."
          columns={[
            {
              key: 'user',
              label: 'User',
              render: (row) =>
                row.user ? (
                  <div className="cell-stack">
                    <strong>{row.user.name}</strong>
                    <small className="text-muted">{row.user.email}</small>
                  </div>
                ) : (
                  '—'
                ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (row) => (row.user?.role ? humanizeStatus(row.user.role) : '—'),
            },
            { key: 'name', label: 'Device' },
            {
              key: 'last_used_at',
              label: 'Last active',
              render: (row) =>
                row.last_used_at
                  ? formatDate(row.last_used_at, { hour: 'numeric', minute: '2-digit' })
                  : 'Never',
            },
            {
              key: 'created_at',
              label: 'Signed in',
              render: (row) =>
                row.created_at
                  ? formatDate(row.created_at, { hour: 'numeric', minute: '2-digit' })
                  : '—',
            },
            {
              key: 'action',
              label: '',
              render: (row) =>
                row.is_current ? (
                  <span className="text-muted">This session</span>
                ) : (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="link-button"
                      disabled={busy === `end-${row.id}`}
                      onClick={() => terminate(row)}
                    >
                      Terminate
                    </button>
                    {row.user ? (
                      <button
                        type="button"
                        className="link-button"
                        disabled={busy === `end-user-${row.user.id}`}
                        onClick={() => terminateAll(row)}
                      >
                        End all
                      </button>
                    ) : null}
                  </div>
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
              Page {meta.current_page} of {meta.last_page} ({meta.total} session(s))
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
