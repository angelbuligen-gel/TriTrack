import { useEffect, useState } from 'react'

import Alert from './Alert'
import Button from './Button'
import Modal from './Modal'
import treasuryService from '../services/treasuryService'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { confirmCreate } from '../utils/confirm'

function blankItem() {
  return { fee_type_id: '', description: '', amount: '' }
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

export default function AssessApplicationModal({ application, onClose, onSaved }) {
  const [items, setItems] = useState([])
  const [remarks, setRemarks] = useState('')
  const [feeTypes, setFeeTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const types = await treasuryService.applications.feeTypes(application.id)

        if (!active) {
          return
        }

        setFeeTypes(types)

        const existing = application.assessment?.items

        if (existing?.length) {
          setItems(
            existing.map((item) => ({
              fee_type_id: item.fee_type_id || '',
              description: item.description,
              amount: String(item.amount),
            })),
          )
          setRemarks(application.assessment?.remarks || '')
        } else {
          setItems(
            types.map((fee) => ({
              fee_type_id: fee.id,
              description: fee.name,
              amount: String(fee.amount),
            })),
          )
        }
      } catch (exception) {
        if (active) {
          setError(getErrorMessage(exception, 'Fee types could not be loaded.'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [application])

  const updateItem = (index, patch) => {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    )
  }

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const submit = async (event) => {
    event.preventDefault()

    const confirmed = await confirmCreate({
      entity: 'fee assessment',
      details: [
        { label: 'Application', value: application.reference_number },
        { label: 'Line items', value: String(items.length) },
        { label: 'Total', value: money(total) },
      ],
      confirmButtonText: 'Yes, save assessment',
    })

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await treasuryService.applications.assess(application.id, {
        remarks: remarks || null,
        items: items.map((item) => ({
          fee_type_id: item.fee_type_id || null,
          description: item.description || null,
          amount: Number(item.amount),
        })),
      })

      onSaved?.()
      onClose()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)
      setError(
        Object.values(fieldErrors)[0] ||
          getErrorMessage(exception, 'The assessment could not be saved.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      wide
      title={`Assess fees - ${application.reference_number}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="assess-form" loading={saving}>
            Save assessment
          </Button>
        </>
      }
    >
      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <dl className="detail-list">
        <div>
          <dt>Franchisee</dt>
          <dd>{application.franchisee?.full_name || '-'}</dd>
        </div>
        <div>
          <dt>Franchise</dt>
          <dd>{application.franchise?.franchise_number || '-'}</dd>
        </div>
        <div>
          <dt>Application type</dt>
          <dd>{application.type_label}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{application.status_label}</dd>
        </div>
      </dl>

      {loading ? (
        <p className="empty-state">Loading fee schedule...</p>
      ) : (
        <form id="assess-form" className="form" onSubmit={submit}>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fee</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      {item.fee_type_id ? (
                        <div className="cell-stack">
                          <strong>{item.description}</strong>
                          <small className="text-muted">
                            {feeTypes.find((fee) => fee.id === Number(item.fee_type_id))?.code || 'Standard fee'}
                          </small>
                        </div>
                      ) : (
                        <input
                          className="field__input"
                          value={item.description}
                          placeholder="Custom fee description"
                          onChange={(event) => updateItem(index, { description: event.target.value })}
                          required
                        />
                      )}
                    </td>
                    <td>
                      <input
                        className="field__input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.amount}
                        onChange={(event) => updateItem(index, { amount: event.target.value })}
                        required
                      />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="link-button link-button--danger"
                        onClick={() => setItems((current) => current.filter((_, position) => position !== index))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th colSpan={2}>{money(total)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="row-actions">
            <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, blankItem()])}>
              Add fee line
            </Button>
            {feeTypes.length > 0 && items.length !== feeTypes.length ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setItems(
                    feeTypes.map((fee) => ({
                      fee_type_id: fee.id,
                      description: fee.name,
                      amount: String(fee.amount),
                    })),
                  )
                }
              >
                Reset to fee schedule
              </Button>
            ) : null}
          </div>

          <label className="field">
            <span className="field__label">Remarks (optional)</span>
            <textarea
              className="field__input"
              rows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Notes visible to the franchisee on the assessment."
            />
          </label>
        </form>
      )}
    </Modal>
  )
}
