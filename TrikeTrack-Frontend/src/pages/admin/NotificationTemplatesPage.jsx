import { useCallback, useEffect, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage, getFieldErrors } from '../../services/api'
import { humanizeStatus } from '../../utils/format'

const TYPE_OPTIONS = ['info', 'success', 'warning', 'error']

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [placeholders, setPlaceholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.notificationTemplates.list()
      setTemplates(result.templates || [])
      setPlaceholders(result.placeholders || [])
    } catch (exception) {
      setError(getErrorMessage(exception, 'Notification templates could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const updated = await adminService.notificationTemplates.update(form.id, {
        title: form.title,
        body: form.body,
        type: form.type,
        is_enabled: Boolean(form.is_enabled),
      })

      setTemplates((current) => current.map((template) => (template.id === updated.id ? updated : template)))
      setNotice(`${updated.label} saved.`)
      setForm(null)
    } catch (exception) {
      setError(
        Object.values(getFieldErrors(exception))[0] ||
          getErrorMessage(exception, 'The notification template could not be saved.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (template) => {
    setError('')

    try {
      const updated = await adminService.notificationTemplates.update(template.id, {
        title: template.title,
        body: template.body,
        type: template.type,
        is_enabled: !template.is_enabled,
      })

      setTemplates((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      setNotice(`${updated.label} ${updated.is_enabled ? 'enabled' : 'disabled'}.`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The notification template could not be updated.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Notification templates"
        text="Wording for every notification event, and a switch to turn individual events off. Placeholders are replaced when the notification is sent."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error && !form ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <section className="panel">
        <p className="field__hint">Placeholders: {placeholders.join(' ')}</p>

        <DataTable
          loading={loading}
          rows={templates}
          rowKey={(row) => row.id}
          emptyMessage="No notification templates configured."
          columns={[
            { key: 'label', label: 'Event' },
            { key: 'title', label: 'Title' },
            {
              key: 'body',
              label: 'Message',
              render: (row) => <span className="text-muted">{row.body}</span>,
            },
            {
              key: 'type',
              label: 'Tone',
              render: (row) => humanizeStatus(row.type),
            },
            {
              key: 'is_enabled',
              label: 'Enabled',
              render: (row) => (row.is_enabled ? 'Yes' : 'No'),
            },
            {
              key: 'action',
              label: '',
              render: (row) => (
                <div className="row-actions">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      setForm({
                        id: row.id,
                        label: row.label,
                        title: row.title,
                        body: row.body,
                        type: row.type,
                        is_enabled: row.is_enabled,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button type="button" className="link-button" onClick={() => toggle(row)}>
                    {row.is_enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      <Modal
        open={Boolean(form)}
        wide
        title={form ? `Edit ${form.label}` : 'Edit notification'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="notification-template-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {form ? (
          <form id="notification-template-form" className="form" onSubmit={save}>
            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="form-grid">
              <label className="field field--span-2">
                <span className="field__label">Title</span>
                <input
                  className="field__input"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>

              <label className="field field--span-2">
                <span className="field__label">Message</span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={5}
                  value={form.body}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, body: event.target.value }))
                  }
                />
                <span className="field__hint">Placeholders: {placeholders.join(' ')}</span>
              </label>

              <label className="field">
                <span className="field__label">Tone</span>
                <select
                  className="field__input"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {humanizeStatus(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_enabled)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_enabled: event.target.checked }))
                    }
                  />
                  <span>Send this notification</span>
                </span>
              </label>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
