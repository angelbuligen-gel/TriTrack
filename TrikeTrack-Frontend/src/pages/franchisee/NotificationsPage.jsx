import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import accountService from '../../services/accountService'
import { getErrorMessage } from '../../services/api'
import { formatDate, humanizeStatus } from '../../utils/format'

const TONE = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  error: 'danger',
  info: 'info',
}

export default function NotificationsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await accountService.notifications.list({
        unread: unreadOnly ? 1 : undefined,
        page,
        per_page: 10,
      })

      setRows(result.items)
      setMeta(result.meta)
    } catch (exception) {
      setError(getErrorMessage(exception, 'Your notifications could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [unreadOnly, page])

  useEffect(() => {
    load()
  }, [load])

  const markRead = async (notification) => {
    setBusy(`read-${notification.id}`)

    try {
      await accountService.notifications.markRead(notification.id)
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'The notification could not be updated.'))
    } finally {
      setBusy('')
    }
  }

  const markAllRead = async () => {
    setBusy('all')

    try {
      await accountService.notifications.markAllRead()
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception, 'Notifications could not be updated.'))
    } finally {
      setBusy('')
    }
  }

  const unread = meta?.unread_count ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Notifications"
        title="Inbox"
        text="Status changes, document decisions, assessments, payments, and certificate issuance are posted here."
        badge={unread > 0 ? <span className="badge badge--warning">{unread} unread</span> : null}
        actions={
          unread > 0 ? (
            <Button variant="secondary" loading={busy === 'all'} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setPage(1)
              setUnreadOnly(event.target.checked)
            }}
          />
          <span>Show unread only</span>
        </label>

        {loading ? (
          <p className="empty-state">Loading notifications...</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">No notifications match this filter.</p>
        ) : (
          <ul className="timeline">
            {rows.map((notification) => (
              <li
                key={notification.id}
                className="timeline__item"
                style={{ opacity: notification.is_read ? 0.65 : 1 }}
              >
                <div className="timeline__head">
                  <strong>{notification.title}</strong>
                  <span className={`badge badge--${TONE[notification.type] || 'info'}`}>
                    {humanizeStatus(notification.type)}
                  </span>
                </div>
                <p className="record-card__meta">{notification.message}</p>
                <div className="row-actions">
                  <small className="text-muted">
                    {formatDate(notification.created_at, { hour: 'numeric', minute: '2-digit' })}
                  </small>
                  {!notification.is_read ? (
                    <Button
                      variant="ghost"
                      loading={busy === `read-${notification.id}`}
                      onClick={() => markRead(notification)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {meta && meta.last_page > 1 ? (
          <div className="pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.current_page} of {meta.last_page}
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
