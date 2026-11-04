import { useEffect, useMemo, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage } from '../../services/api'
import { humanizeStatus } from '../../utils/format'

const GROUP_LABELS = {
  general: 'General',
  franchise: 'Franchise rules',
  payments: 'Payments',
  documents: 'Documents and OCR',
  notifications: 'Notifications',
}

function editableValue(setting) {
  if (setting.type === 'boolean') {
    return setting.value === true || setting.value === 1 || setting.value === '1'
  }

  if (setting.type === 'json') {
    return Array.isArray(setting.value) ? setting.value.join(', ') : ''
  }

  return setting.value ?? ''
}

function payloadValue(setting, value) {
  if (setting.type === 'boolean') {
    return Boolean(value)
  }

  if (setting.type === 'json') {
    return String(value)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return value
}

export default function SystemConfigurationPage() {
  const [settings, setSettings] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let active = true

    adminService
      .settings()
      .then((groups) => {
        if (!active) {
          return
        }

        const flat = Object.values(groups).flat()
        const nextValues = {}

        flat.forEach((setting) => {
          nextValues[setting.key] = editableValue(setting)
        })

        setSettings(flat)
        setValues(nextValues)
      })
      .catch((exception) => {
        if (active) {
          setError(getErrorMessage(exception, 'System settings could not be loaded.'))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const grouped = useMemo(() => {
    const result = {}

    settings.forEach((setting) => {
      result[setting.group] = result[setting.group] || []
      result[setting.group].push(setting)
    })

    return result
  }, [settings])

  const update = (setting, value) => {
    setDirty(true)
    setValues((current) => ({ ...current, [setting.key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = settings.map((setting) => ({
        key: setting.key,
        value: payloadValue(setting, values[setting.key]),
      }))

      const groups = await adminService.updateSettings(payload)
      const flat = Object.values(groups).flat()
      const nextValues = {}

      flat.forEach((setting) => {
        nextValues[setting.key] = editableValue(setting)
      })

      setSettings(flat)
      setValues(nextValues)
      setDirty(false)
      setNotice('System settings saved.')
    } catch (exception) {
      setError(getErrorMessage(exception, 'Settings could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="System configuration"
        text="Operational settings used by certificates, franchise rules, payments, OCR, and notifications."
        actions={
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        }
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {loading ? <p className="empty-state">Loading settings...</p> : null}

      {!loading
        ? Object.entries(grouped).map(([group, groupSettings]) => (
            <section className="panel" key={group}>
              <h2 className="panel__title">{GROUP_LABELS[group] || humanizeStatus(group)}</h2>
              <div className="form-grid">
                {groupSettings.map((setting) => (
                  <label className="field" key={setting.key}>
                    <span className="field__label">{setting.label}</span>

                    {setting.type === 'boolean' ? (
                      <span className="checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(values[setting.key])}
                          onChange={(event) => update(setting, event.target.checked)}
                        />
                        <span>Enabled</span>
                      </span>
                    ) : setting.type === 'integer' ? (
                      <input
                        className="field__input"
                        type="number"
                        value={values[setting.key] ?? ''}
                        onChange={(event) => update(setting, event.target.value)}
                      />
                    ) : setting.type === 'json' ? (
                      <input
                        className="field__input"
                        value={values[setting.key] ?? ''}
                        onChange={(event) => update(setting, event.target.value)}
                        placeholder="Comma-separated values"
                      />
                    ) : (
                      <input
                        className="field__input"
                        value={values[setting.key] ?? ''}
                        onChange={(event) => update(setting, event.target.value)}
                      />
                    )}

                    {setting.description ? <span className="field__hint">{setting.description}</span> : null}
                  </label>
                ))}
              </div>
            </section>
          ))
        : null}

      {!loading && settings.length > 0 ? (
        <div className="row-actions">
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
          {dirty ? <span className="text-muted">Unsaved changes</span> : null}
        </div>
      ) : null}
    </>
  )
}
