import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { saveBlob } from '../../services/applicationService'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

function bytes(value) {
  const size = Number(value || 0)

  if (size >= 1073741824) {
    return `${(size / 1073741824).toFixed(1)} GB`
  }

  if (size >= 1048576) {
    return `${(size / 1048576).toFixed(1)} MB`
  }

  return `${Math.round(size / 1024)} KB`
}

export default function BackupPage() {
  const [backups, setBackups] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.backups.list()
      setBackups(result.backups || [])
      setHealth(result.health || null)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Backups could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createBackup = async () => {
    setBusy('create')
    setError('')

    try {
      const backup = await adminService.backups.create()
      setNotice(`Backup ${backup.name} created (${backup.size_human}).`)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The backup could not be created.'))
    } finally {
      setBusy('')
    }
  }

  const restore = async (backup) => {
    const answer = window.prompt(
      `Restoring replaces the live database with ${backup.name}.\nType RESTORE to continue.`,
    )

    if (answer !== 'RESTORE') {
      return
    }

    setBusy(`restore-${backup.name}`)
    setError('')

    try {
      await adminService.backups.restore(backup.name)
      setNotice(`Database restored from ${backup.name}.`)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The database could not be restored.'))
    } finally {
      setBusy('')
    }
  }

  const download = async (backup) => {
    setBusy(`download-${backup.name}`)
    setError('')

    try {
      const blob = await adminService.backups.download(backup.name)
      saveBlob(blob, backup.name)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The backup could not be downloaded.'))
    } finally {
      setBusy('')
    }
  }

  const remove = async (backup) => {
    if (!window.confirm(`Delete backup ${backup.name}?`)) {
      return
    }

    setBusy(`delete-${backup.name}`)
    setError('')

    try {
      await adminService.backups.remove(backup.name)
      setNotice(`Backup ${backup.name} deleted.`)
      load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The backup could not be deleted.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Backup and maintenance"
        text="Database snapshots and system health. Restoring replaces the live database, so a snapshot is taken automatically before every restore."
        actions={
          <Button onClick={createBackup} loading={busy === 'create'}>
            Create backup
          </Button>
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">Database</span>
          <strong className="stat-card__value">
            {health ? (health.database_ok ? 'Connected' : 'Unavailable') : '—'}
          </strong>
          <span className="stat-card__detail">
            {health ? `${health.driver} · PHP ${health.php_version}` : ''}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Storage</span>
          <strong className="stat-card__value">
            {health ? (health.backup_directory_writable ? 'Writable' : 'Read-only') : '—'}
          </strong>
          <span className="stat-card__detail">
            {health?.disk_free_bytes ? `${bytes(health.disk_free_bytes)} free` : ''}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Records</span>
          <strong className="stat-card__value">{health?.counts?.franchises ?? 0}</strong>
          <span className="stat-card__detail">
            {health?.counts?.users ?? 0} users · {health?.counts?.applications ?? 0} applications
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Backups kept</span>
          <strong className="stat-card__value">{backups.length}</strong>
          <span className="stat-card__detail">Stored outside the database</span>
        </article>
      </div>

      <section className="panel">
        <h2 className="panel__title">Backup history</h2>
        <DataTable
          loading={loading}
          rows={backups}
          rowKey={(row) => row.name}
          emptyMessage="No backups yet."
          columns={[
            { key: 'name', label: 'File' },
            { key: 'size_human', label: 'Size' },
            {
              key: 'created_at',
              label: 'Created',
              render: (row) =>
                row.created_at ? formatDate(row.created_at, { hour: 'numeric', minute: '2-digit' }) : '-',
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <div className="row-actions">
                  <button
                    type="button"
                    className="link-button"
                    disabled={busy === `download-${row.name}`}
                    onClick={() => download(row)}
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    disabled={busy === `restore-${row.name}`}
                    onClick={() => restore(row)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    disabled={busy === `delete-${row.name}`}
                    onClick={() => remove(row)}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
    </>
  )
}
