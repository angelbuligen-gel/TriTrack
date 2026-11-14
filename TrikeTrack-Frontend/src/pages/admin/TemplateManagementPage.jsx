import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '../../components/Alert'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import adminService from '../../services/adminService'
import { getErrorMessage, getFieldErrors } from '../../services/api'

const CATEGORY_LABELS = {
  certificate: 'Certificate templates',
  form: 'Application form templates',
}

const EMPTY_FORM = {
  name: '',
  title: '',
  statements: '',
  header_text: '',
  footer_text: '',
  signatory_name: '',
  signatory_position: '',
  date_format: 'F j, Y',
  is_active: true,
}

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState([])
  const [placeholders, setPlaceholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await adminService.templates.list()
      setTemplates(result.templates || [])
      setPlaceholders(result.placeholders || [])
    } catch (exception) {
      setError(getErrorMessage(exception, 'Document templates could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(
    () => ({
      certificate: templates.filter((template) => template.category === 'certificate'),
      form: templates.filter((template) => template.category === 'form'),
    }),
    [templates],
  )

  const openEdit = (template) => {
    setError('')
    setForm({
      id: template.id,
      label: template.label,
      name: template.name,
      title: template.title || '',
      statements: template.statements || '',
      header_text: template.header_text || '',
      footer_text: template.footer_text || '',
      signatory_name: template.signatory_name || '',
      signatory_position: template.signatory_position || '',
      date_format: template.date_format || 'F j, Y',
      is_active: template.is_active,
      has_logo: template.has_logo,
      has_signature: template.has_signature,
    })
  }

  const replaceForm = (updated) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === updated.id ? updated : template,
      ),
    )
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const updated = await adminService.templates.update(form.id, {
        name: form.name,
        title: form.title || null,
        statements: form.statements || null,
        header_text: form.header_text || null,
        footer_text: form.footer_text || null,
        signatory_name: form.signatory_name || null,
        signatory_position: form.signatory_position || null,
        date_format: form.date_format || null,
        is_active: Boolean(form.is_active),
      })

      replaceForm(updated)
      setNotice(`${updated.label} saved.`)
      setForm(null)
    } catch (exception) {
      setError(
        Object.values(getFieldErrors(exception))[0] ||
          getErrorMessage(exception, 'The template could not be saved.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const uploadAsset = async (type, file) => {
    if (!file) {
      return
    }

    setBusy(type)
    setError('')

    try {
      const updated = await adminService.templates.uploadAsset(form.id, type, file)
      replaceForm(updated)
      setForm((current) =>
        current
          ? {
              ...current,
              has_logo: updated.has_logo,
              has_signature: updated.has_signature,
            }
          : current,
      )
      setNotice(`${type === 'logo' ? 'Logo' : 'Signature'} updated.`)
    } catch (exception) {
      setError(
        Object.values(getFieldErrors(exception))[0] ||
          getErrorMessage(exception, 'The file could not be uploaded.'),
      )
    } finally {
      setBusy('')
    }
  }

  const restore = async (template) => {
    setBusy(`restore-${template.id}`)
    setError('')

    try {
      const updated = await adminService.templates.restore(template.id)
      replaceForm(updated)
      setNotice(`${updated.label} restored to its default content.`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The template could not be restored.'))
    } finally {
      setBusy('')
    }
  }

  const preview = async (template) => {
    setBusy(`preview-${template.id}`)
    setError('')

    try {
      const blob = await adminService.templates.preview(template.id)
      const url = URL.createObjectURL(blob)

      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The preview could not be generated.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Document templates"
        text="Wording, signatories, logos and signatures for every certificate and application form. Generated documents always use the latest saved version."
      />

      {notice ? <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert> : null}
      {error && !form ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      {loading ? <p className="empty-state">Loading templates...</p> : null}

      {['certificate', 'form'].map((category) => (
        <section className="panel" key={category}>
          <h2 className="panel__title">{CATEGORY_LABELS[category]}</h2>

          <div className="template-grid">
            {(grouped[category] || []).map((template) => (
              <article className="template-card" key={template.id}>
                <div className="record-card__head">
                  <div>
                    <strong>{template.label}</strong>
                    <p className="record-card__meta">
                      {template.title || template.name}
                      {template.is_active ? '' : ' · inactive'}
                    </p>
                  </div>
                </div>

                <p className="record-card__meta">
                  Signatory: {template.signatory_name || '—'}
                  {template.signatory_position ? ` (${template.signatory_position})` : ''}
                </p>
                <p className="record-card__meta">
                  Logo: {template.has_logo ? 'uploaded' : 'not set'} · Signature:{' '}
                  {template.has_signature ? 'uploaded' : 'not set'}
                </p>

                <div className="row-actions">
                  <Button variant="secondary" onClick={() => openEdit(template)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    loading={busy === `preview-${template.id}`}
                    onClick={() => preview(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    loading={busy === `restore-${template.id}`}
                    onClick={() => restore(template)}
                  >
                    Restore defaults
                  </Button>
                </div>
              </article>
            ))}

            {(grouped[category] || []).length === 0 ? (
              <p className="empty-state">No templates in this group.</p>
            ) : null}
          </div>
        </section>
      ))}

      <Modal
        open={Boolean(form)}
        wide
        title={form ? `Edit ${form.label}` : 'Edit template'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="template-form" loading={saving}>
              Save template
            </Button>
          </>
        }
      >
        {form ? (
          <form id="template-form" className="form" onSubmit={save}>
            {error ? <Alert variant="error">{error}</Alert> : null}

            <div className="form-grid">
              <label className="field">
                <span className="field__label">Template name</span>
                <input
                  className="field__input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Document title</span>
                <input
                  className="field__input"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>

              <label className="field field--span-2">
                <span className="field__label">Header text</span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={2}
                  value={form.header_text}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, header_text: event.target.value }))
                  }
                  placeholder="One line per header row"
                />
              </label>

              <label className="field field--span-2">
                <span className="field__label">Statements / content</span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={4}
                  value={form.statements}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, statements: event.target.value }))
                  }
                />
                <span className="field__hint">
                  Placeholders: {placeholders.join(' ')}
                </span>
              </label>

              <label className="field field--span-2">
                <span className="field__label">Footer text</span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={2}
                  value={form.footer_text}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, footer_text: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Authorized signatory</span>
                <input
                  className="field__input"
                  value={form.signatory_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, signatory_name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Signatory position</span>
                <input
                  className="field__input"
                  value={form.signatory_position}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, signatory_position: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span className="field__label">Date format</span>
                <input
                  className="field__input"
                  value={form.date_format}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date_format: event.target.value }))
                  }
                  placeholder="F j, Y"
                />
              </label>

              <label className="field">
                <span className="checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_active)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_active: event.target.checked }))
                    }
                  />
                  <span>Active</span>
                </span>
              </label>

              <label className="field">
                <span className="field__label">Official logo</span>
                <input
                  className="field__input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy === 'logo'}
                  onChange={(event) => uploadAsset('logo', event.target.files?.[0])}
                />
                <span className="field__hint">
                  {form.has_logo ? 'A logo is currently set.' : 'No logo uploaded.'}
                </span>
              </label>

              <label className="field">
                <span className="field__label">Signature image</span>
                <input
                  className="field__input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy === 'signature'}
                  onChange={(event) => uploadAsset('signature', event.target.files?.[0])}
                />
                <span className="field__hint">
                  {form.has_signature ? 'A signature is currently set.' : 'No signature uploaded.'}
                </span>
              </label>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
