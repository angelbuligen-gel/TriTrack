import { useRef, useState } from 'react'

import Alert from './Alert'
import Button from './Button'
import DocumentPreview from './DocumentPreview'
import StatusBadge from './StatusBadge'
import accountService from '../services/accountService'
import applicationService, { fetchCertificateBlob, saveBlob } from '../services/applicationService'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { confirmCreate } from '../utils/confirm'
import { formatDate, humanizeStatus } from '../utils/format'

const STATE_TONES = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  missing: 'info',
}

/**
 * Full application view shared by the franchisee tracking page and the
 * BPLO renewal/document pages. Staff-only controls appear when
 * `role` is "bplo".
 */
export default function ApplicationDetail({ application, role, onChanged, onNotify }) {
  const isStaff = role === 'bplo'
  const fileInput = useRef(null)
  const [pendingCode, setPendingCode] = useState('')
  const [previewDocument, setPreviewDocument] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState('')
  const [rejectingDocument, setRejectingDocument] = useState(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [remarks, setRemarks] = useState('')
  const [decisionPanel, setDecisionPanel] = useState('')
  const [mlDocument, setMlDocument] = useState(null)
  const [mlFields, setMlFields] = useState([])
  const [paying, setPaying] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const summary = application.summary
  const open = application.is_open
  const assessment = application.assessment
  const payments = application.payments ?? []
  const successfulPayment = payments.find((payment) => payment.status === 'successful')
  const latestPayment = payments[0]
  const certificate = application.certificate
  const transfer = application.transfer_detail
  const vehicleChange = application.vehicle_change

  const run = async (key, action, successMessage) => {
    setBusy(key)
    setError('')

    try {
      await action()
      setRemarks('')
      setDecisionPanel('')
      setRejectingDocument(null)
      setReviewRemarks('')
      onNotify?.(successMessage)
      await onChanged?.()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)
      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception))
    } finally {
      setBusy('')
    }
  }

  const triggerUpload = (code) => {
    setPendingCode(code)
    setError('')

    if (fileInput.current) {
      fileInput.current.value = ''
      fileInput.current.click()
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]

    if (!file || !pendingCode) {
      return
    }

    const confirmed = await confirmCreate({
      entity: 'document submission',
      details: [
        { label: 'Document type', value: pendingCode },
        { label: 'File', value: file.name },
        { label: 'Application', value: application.reference_number },
      ],
      confirmButtonText: 'Yes, submit document',
    })

    if (!confirmed) {
      if (fileInput.current) {
        fileInput.current.value = ''
      }

      setPendingCode('')
      return
    }

    setUploading(true)
    setError('')

    try {
      await applicationService.mine.uploadDocument(application.id, pendingCode, file)
      onNotify?.(`${file.name} submitted for review.`)
      await onChanged?.()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)

      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The document could not be uploaded.'))
    } finally {
      setUploading(false)
      setPendingCode('')
    }
  }

  const submitReview = (document, reviewStatus) => {
    if (reviewStatus === 'rejected' && !reviewRemarks.trim()) {
      setError('Explain what needs to be corrected before rejecting the document.')
      return
    }

    run(
      `review-${document.id}`,
      () => applicationService.bplo.reviewDocument(document.id, reviewStatus, reviewRemarks),
      reviewStatus === 'approved' ? 'Document approved.' : 'Document rejected and the franchisee notified.',
    )
  }

  const openMlEditor = (document) => {
    const values = document.ml_extracted && Object.keys(document.ml_extracted).length > 0
      ? document.ml_extracted
      : { document_number: '', full_name: '', motor_number: '', chassis_number: '', plate_number: '' }

    setMlDocument(document)
    setMlFields(Object.entries(values).map(([key, value]) => ({ key, value: value ?? '' })))
    setError('')
  }

  const runExtraction = async (document) => {
    setBusy(`extract-${document.id}`)
    setError('')

    try {
      const updated = await applicationService.bplo.extractDocument(document.id)
      setNoticeMessage(`${document.document_type} extraction completed. Review the suggested values.`)
      openMlEditor(updated)
      await onChanged?.()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)

      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The document could not be processed.'))
    } finally {
      setBusy('')
    }
  }

  const confirmExtraction = async () => {
    if (!mlDocument) {
      return
    }

    const values = mlFields.reduce((acc, field) => {
      if (field.key.trim()) {
        acc[field.key.trim()] = field.value
      }

      return acc
    }, {})

    setBusy('confirm-extraction')
    setError('')

    try {
      await applicationService.bplo.confirmExtraction(mlDocument.id, values, null)
      setNoticeMessage('Extracted values verified and saved.')
      setMlDocument(null)
      setMlFields([])
      await onChanged?.()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)

      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The extracted values could not be saved.'))
    } finally {
      setBusy('')
    }
  }

  const startPayment = async () => {
    if (!assessment) {
      return
    }

    setPaying(true)
    setError('')

    try {
      const payment = await accountService.payments.initiate({
        assessment_id: assessment.id,
        method: 'online',
      })

      if (payment.checkout_url) {
        window.location.assign(payment.checkout_url)
        return
      }

      setNoticeMessage(
        `Payment ${payment.reference_number} created. Present this reference to treasury to confirm your payment.`,
      )
      await onChanged?.()
    } catch (exception) {
      const fieldErrors = getFieldErrors(exception)

      setError(Object.values(fieldErrors)[0] || getErrorMessage(exception, 'The payment could not be started.'))
    } finally {
      setPaying(false)
    }
  }

  const issueCertificate = async () => {
    const confirmed = await confirmCreate({
      entity: 'certificate',
      details: [
        { label: 'Application', value: application.reference_number },
        { label: 'Type', value: humanizeStatus(application.type) },
      ],
      confirmButtonText: 'Yes, issue certificate',
    })

    if (!confirmed) {
      return
    }

    run(
      'issue-certificate',
      () => applicationService.bplo.issueCertificate(application.id),
      'Certificate issued successfully.',
    )
  }

  const downloadCertificate = async () => {
    if (!certificate) {
      return
    }

    setDownloading(true)
    setError('')

    try {
      const blob = await fetchCertificateBlob(certificate)
      saveBlob(blob, `${certificate.certificate_number}.pdf`)
    } catch (exception) {
      setError(getErrorMessage(exception, 'The certificate could not be downloaded.'))
    } finally {
      setDownloading(false)
    }
  }

  const setNoticeMessage = (message) => {
    if (onNotify) {
      onNotify(message)
    }
  }

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        hidden
        onChange={handleFile}
      />

      {error ? <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert> : null}

      <dl className="detail-list">
        <div>
          <dt>Reference</dt>
          <dd>
            <strong>{application.reference_number}</strong>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge value={application.status} />
          </dd>
        </div>
        <div>
          <dt>Franchise</dt>
          <dd>{application.franchise?.franchise_number || '—'}</dd>
        </div>
        <div>
          <dt>Franchisee</dt>
          <dd>{application.franchisee?.full_name || '—'}</dd>
        </div>
        <div>
          <dt>Coverage year</dt>
          <dd>{application.coverage_year || '—'}</dd>
        </div>
        <div>
          <dt>Previous expiry</dt>
          <dd>{formatDate(application.previous_expiration_date)}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{formatDate(application.submitted_at, { hour: 'numeric', minute: '2-digit' })}</dd>
        </div>
        <div>
          <dt>Decided</dt>
          <dd>{formatDate(application.decided_at, { hour: 'numeric', minute: '2-digit' })}</dd>
        </div>
      </dl>

      {transfer ? (
        <section className="panel">
          <h3 className="panel__title">Proposed transfer</h3>
          <dl className="detail-list">
            <div>
              <dt>New owner</dt>
              <dd>{transfer.new_owner.full_name}</dd>
            </div>
            <div>
              <dt>Contact number</dt>
              <dd>{transfer.new_owner.contact_number}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{transfer.new_owner.email || '-'}</dd>
            </div>
            <div>
              <dt>Relationship</dt>
              <dd>{transfer.relationship_to_owner || '-'}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{transfer.new_owner.address}</dd>
            </div>
            <div>
              <dt>Barangay</dt>
              <dd>{transfer.new_owner.barangay || '-'}</dd>
            </div>
            <div>
              <dt>City / municipality</dt>
              <dd>{transfer.new_owner.city_municipality || '-'}</dd>
            </div>
            <div>
              <dt>Province</dt>
              <dd>{transfer.new_owner.province || '-'}</dd>
            </div>
          </dl>
          {transfer.remarks ? <p className="panel__text">{transfer.remarks}</p> : null}
          {application.status === 'approved' && isStaff ? (
            <Alert variant="success" title="Ownership transferred">
              The franchise record has been reassigned to {transfer.new_owner.full_name}.
            </Alert>
          ) : null}
        </section>
      ) : null}

      {vehicleChange ? (
        <section className="panel">
          <h3 className="panel__title">Motor change</h3>
          <dl className="detail-list">
            <div>
              <dt>Existing motor</dt>
              <dd>
                {vehicleChange.existing_vehicle
                  ? `${vehicleChange.existing_vehicle.plate_number || 'No plate'} - ${vehicleChange.existing_vehicle.motor_number}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>Proposed plate no.</dt>
              <dd>{vehicleChange.proposed.plate_number || '-'}</dd>
            </div>
            <div>
              <dt>Proposed motor no.</dt>
              <dd>{vehicleChange.proposed.motor_number || '-'}</dd>
            </div>
            <div>
              <dt>Proposed chassis no.</dt>
              <dd>{vehicleChange.proposed.chassis_number || '-'}</dd>
            </div>
            <div>
              <dt>Make / model</dt>
              <dd>{[vehicleChange.proposed.make, vehicleChange.proposed.model].filter(Boolean).join(' ') || '-'}</dd>
            </div>
            <div>
              <dt>Year / color</dt>
              <dd>
                {[vehicleChange.proposed.year_model, vehicleChange.proposed.color].filter(Boolean).join(' / ') || '-'}
              </dd>
            </div>
            <div>
              <dt>OR / CR number</dt>
              <dd>
                {[vehicleChange.proposed.or_number, vehicleChange.proposed.cr_number].filter(Boolean).join(' / ') || '-'}
              </dd>
            </div>
          </dl>
          {vehicleChange.remarks ? <p className="panel__text">{vehicleChange.remarks}</p> : null}
        </section>
      ) : null}

      {application.franchisee_remarks ? (
        <Alert variant="info" title="Franchisee remarks">
          {application.franchisee_remarks}
        </Alert>
      ) : null}

      {application.staff_remarks ? (
        <Alert variant={application.status === 'rejected' ? 'error' : 'info'} title="BPLO remarks">
          {application.staff_remarks}
        </Alert>
      ) : null}

      {assessment ? (
        <section className="panel">
          <div className="record-card__head">
            <div>
              <h3 className="panel__title">Fees and payment</h3>
              <p className="panel__text">
                Assessment {assessment.assessment_number} - {assessment.status}
              </p>
            </div>
            <StatusBadge value={assessment.status} />
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Fee</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(assessment.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>PHP {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>
                      PHP {Number(assessment.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {assessment.remarks ? <p className="panel__text">{assessment.remarks}</p> : null}

          {latestPayment ? (
            <p className="panel__text">
              Latest payment <strong>{latestPayment.reference_number}</strong> is{' '}
              <strong>{latestPayment.status}</strong>
              {latestPayment.provider_reference ? ` (provider ref ${latestPayment.provider_reference})` : ''}.
            </p>
          ) : null}

          {!isStaff && assessment.status === 'pending' ? (
            <div className="row-actions">
              <Button loading={paying} onClick={startPayment}>
                Pay PHP {Number(assessment.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Button>
            </div>
          ) : null}

          {!isStaff && assessment.status === 'pending' && latestPayment?.status === 'pending' ? (
            <p className="field__hint">
              Treasury confirms every transaction. Keep the payment reference until the status changes to
              successful.
            </p>
          ) : null}
        </section>
      ) : isStaff && application.status === 'approved' ? (
        <Alert variant="info" title="No assessment yet">
          Treasury personnel must assess the fees before the franchisee can pay and before the certificate is
          issued.
        </Alert>
      ) : null}

      {certificate ? (
        <section className="panel">
          <div className="record-card__head">
            <div>
              <h3 className="panel__title">Certificate</h3>
              <p className="panel__text">
                {certificate.certificate_number} - issued {formatDate(certificate.issued_at)}
              </p>
            </div>
            <Button variant="secondary" loading={downloading} onClick={downloadCertificate}>
              Download PDF
            </Button>
          </div>
          {certificate.issued_by ? (
            <p className="panel__text">Issued by {certificate.issued_by}.</p>
          ) : null}
        </section>
      ) : isStaff && (application.status === 'approved' || application.status === 'completed') ? (
        <section className="panel">
          <div className="record-card__head">
            <div>
              <h3 className="panel__title">Certificate</h3>
              <p className="panel__text">No certificate has been generated for this application yet.</p>
            </div>
            <Button loading={busy === 'issue-certificate'} onClick={issueCertificate}>
              Generate certificate
            </Button>
          </div>
        </section>
      ) : null}

      {successfulPayment && application.status === 'approved' && !certificate && !isStaff ? (
        <Alert variant="success" title="Payment confirmed">
          BPLO can now generate your certificate. You will receive a notification when it is ready.
        </Alert>
      ) : null}

      <section className="panel">
        <h3 className="panel__title">Document checklist</h3>
        <p className="panel__text">
          {summary.approved} of {summary.required_total} required documents approved
          {summary.missing > 0 ? ` · ${summary.missing} still missing` : ''}
          {summary.rejected > 0 ? ` · ${summary.rejected} rejected` : ''}
        </p>

        <div className="checklist">
          {(application.checklist || []).map((item) => (
            <div
              key={item.code}
              className={`checklist__item${item.state === 'missing' ? ' checklist__item--missing' : ''}`}
            >
              <div className="checklist__meta">
                <strong>
                  {item.name}
                  {item.is_required ? '' : ' (optional)'}
                </strong>
                <small>{item.description}</small>
                {item.latest_document ? (
                  <small>
                    Latest: {formatDate(item.latest_document.uploaded_at, { hour: 'numeric', minute: '2-digit' })}
                    {item.submission_count > 1 ? ` · ${item.submission_count} submissions on record` : ''}
                  </small>
                ) : (
                  <small>Not submitted yet.</small>
                )}

                {item.documents.length > 0 ? (
                  <div className="doc-history">
                    {item.documents.map((document) => (
                      <div key={document.id} className="doc-history__row">
                        <span>
                          {formatDate(document.uploaded_at, { hour: 'numeric', minute: '2-digit' })} ·{' '}
                          {document.original_name}
                        </span>
                        <span className="doc-history__actions">
                          <span
                            className={`badge badge--${document.review_status === 'approved' ? 'success' : document.review_status === 'rejected' ? 'danger' : 'warning'}`}
                          >
                            {humanizeStatus(document.review_status)}
                          </span>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => setPreviewDocument(document)}
                          >
                            View
                          </button>
                          {isStaff ? (
                            <button
                              type="button"
                              className="link-button"
                              disabled={busy === `extract-${document.id}`}
                              onClick={() => runExtraction(document)}
                            >
                              {busy === `extract-${document.id}`
                                ? 'Extracting...'
                                : document.ml_extracted
                                  ? 'OCR values'
                                  : 'Extract'}
                            </button>
                          ) : null}
                          {isStaff && document.ml_extracted ? (
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => openMlEditor(document)}
                            >
                              Edit fields
                            </button>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="checklist__actions">
                <span className={`badge badge--${STATE_TONES[item.state] || 'info'}`}>
                  {humanizeStatus(item.state)}
                </span>

                {isStaff && item.latest_document && item.latest_document.review_status === 'pending' && open ? (
                  <>
                    <Button
                      variant="secondary"
                      loading={busy === `review-${item.latest_document.id}`}
                      disabled={Boolean(busy)}
                      onClick={() => submitReview(item.latest_document, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        setRejectingDocument(item.latest_document.id)
                        setReviewRemarks('')
                        setError('')
                      }}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}

                {!isStaff && open ? (
                  <Button
                    variant="secondary"
                    loading={uploading && pendingCode === item.code}
                    disabled={uploading}
                    onClick={() => triggerUpload(item.code)}
                  >
                    {item.latest_document ? 'Replace' : 'Upload'}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}

          {!isStaff && open ? (
            <p className="field__hint">
              Each upload is kept as a separate record, so your earlier submissions stay visible.
            </p>
          ) : null}

          {rejectingDocument ? (
            <div className="panel">
              <h4 className="panel__title">Reject document</h4>
              <label className="field">
                <span className="field__label">
                  Reason for rejection <span className="field__required">*</span>
                </span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={3}
                  value={reviewRemarks}
                  onChange={(event) => setReviewRemarks(event.target.value)}
                  placeholder="Explain what the franchisee needs to correct or resubmit."
                />
              </label>
              <div className="row-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRejectingDocument(null)
                    setReviewRemarks('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  loading={busy === `review-${rejectingDocument}`}
                  onClick={() => submitReview({ id: rejectingDocument }, 'rejected')}
                >
                  Confirm rejection
                </Button>
              </div>
            </div>
          ) : null}

          {mlDocument ? (
            <div className="panel">
              <h4 className="panel__title">Extracted values - {mlDocument.document_type}</h4>
              <p className="panel__text">
                OCR suggestions are not accepted automatically. Check every value against the original
                document, correct it if needed, then verify.
              </p>

              <div className="form-grid">
                {mlFields.map((field, index) => (
                  <label className="field" key={`${field.key}-${index}`}>
                    <span className="field__label">{field.key.replaceAll('_', ' ')}</span>
                    <input
                      className="field__input"
                      value={field.value}
                      onChange={(event) => {
                        const next = [...mlFields]
                        next[index] = { ...next[index], value: event.target.value }
                        setMlFields(next)
                      }}
                    />
                  </label>
                ))}
              </div>

              {mlDocument.ml_confidence !== null && mlDocument.ml_confidence !== undefined ? (
                <p className="field__hint">
                  Suggested data covers {Math.round(Number(mlDocument.ml_confidence) * 100)}% of the expected
                  fields.
                  {mlDocument.ml_verified_at ? ` Verified on ${formatDate(mlDocument.ml_verified_at)}.` : ''}
                </p>
              ) : null}

              <div className="row-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMlDocument(null)
                    setMlFields([])
                  }}
                >
                  Cancel
                </Button>
                {!mlDocument.ml_verified_at ? (
                  <Button
                    variant="secondary"
                    loading={busy === `extract-${mlDocument.id}`}
                    onClick={() => runExtraction(mlDocument)}
                  >
                    Re-run extraction
                  </Button>
                ) : null}
                <Button loading={busy === 'confirm-extraction'} onClick={confirmExtraction}>
                  Verify extracted values
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel__title">Status history</h3>
        {(application.status_history || []).length === 0 ? (
          <p className="empty-state">No status changes recorded yet.</p>
        ) : (
          <ul className="timeline">
            {[...(application.status_history || [])].reverse().map((entry) => (
              <li key={entry.id} className="timeline__item">
                <div className="timeline__head">
                  <strong>{humanizeStatus(entry.action)}</strong>
                  <span className="timeline__time">{formatDate(entry.created_at, { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                {entry.from_status && entry.from_status !== entry.to_status ? (
                  <p className="record-card__meta">
                    {humanizeStatus(entry.from_status)} → {humanizeStatus(entry.to_status)}
                  </p>
                ) : null}
                {entry.remarks ? <p className="record-card__meta">{entry.remarks}</p> : null}
                <p className="record-card__meta">
                  {entry.performed_by || 'System'}
                  {entry.performed_by_role ? ` · ${humanizeStatus(entry.performed_by_role)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isStaff && open ? (
        <section className="panel">
          <h3 className="panel__title">Processing actions</h3>

          {decisionPanel ? (
            <>
              <label className="field">
                <span className="field__label">
                  {decisionPanel === 'reject' ? 'Reason for rejection' : 'Approval remarks'}{' '}
                  {decisionPanel === 'reject' ? <span className="field__required">*</span> : null}
                </span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={3}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Record the decision for the application history."
                />
              </label>
              <div className="row-actions">
                <Button variant="secondary" onClick={() => setDecisionPanel('')}>
                  Cancel
                </Button>
                <Button
                  loading={busy === `decision-${decisionPanel}`}
                  onClick={() =>
                    run(
                      `decision-${decisionPanel}`,
                      () => applicationService.bplo.decide(application.id, decisionPanel === 'approve' ? 'approve' : 'reject', remarks),
                      decisionPanel === 'approve' ? 'Application approved.' : 'Application rejected.',
                    )
                  }
                >
                  {decisionPanel === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
                </Button>
              </div>
            </>
          ) : (
            <div className="row-actions">
              {application.status !== 'under_review' ? (
                <Button
                  variant="secondary"
                  loading={busy === 'start'}
                  onClick={() =>
                    run(
                      'start',
                      () => applicationService.bplo.startReview(application.id, remarks || null),
                      'Application review started.',
                    )
                  }
                >
                  Start review
                </Button>
              ) : null}

              <Button
                variant="ghost"
                onClick={() => {
                  setDecisionPanel('correction')
                  setRemarks('')
                }}
              >
                Request correction
              </Button>

              <Button
                variant="secondary"
                disabled={!summary.is_complete}
                title={
                  summary.is_complete
                    ? 'Approve this application'
                    : 'Every required document must be approved first.'
                }
                onClick={() => {
                  setDecisionPanel('approve')
                  setRemarks('')
                }}
              >
                Approve
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setDecisionPanel('reject')
                  setRemarks('')
                }}
              >
                Reject
              </Button>
            </div>
          )}

          {decisionPanel === 'correction' ? (
            <div className="panel">
              <label className="field">
                <span className="field__label">
                  Corrections needed <span className="field__required">*</span>
                </span>
                <textarea
                  className="field__input field__input--textarea"
                  rows={3}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Tell the franchisee which documents or details need to be fixed."
                />
              </label>
              <div className="row-actions">
                <Button variant="secondary" onClick={() => setDecisionPanel('')}>
                  Cancel
                </Button>
                <Button
                  loading={busy === 'correction'}
                  onClick={() =>
                    run(
                      'correction',
                      () => applicationService.bplo.requestCorrection(application.id, remarks),
                      'Correction request sent to the franchisee.',
                    )
                  }
                >
                  Send correction request
                </Button>
              </div>
            </div>
          ) : null}

          {!summary.is_complete ? (
            <p className="field__hint">
              Approval unlocks once every required document has been approved. Rejecting a document sends
              the application back to the franchisee.
            </p>
          ) : null}
        </section>
      ) : null}

      <DocumentPreview document={previewDocument} onClose={() => setPreviewDocument(null)} />
    </>
  )
}
