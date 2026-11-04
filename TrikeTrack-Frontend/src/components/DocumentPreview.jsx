import { useEffect, useRef, useState } from 'react'

import Button from './Button'
import Modal from './Modal'
import { fetchDocumentBlob, saveBlob } from '../services/applicationService'
import { getErrorMessage } from '../services/api'
import { formatDate, humanizeStatus } from '../utils/format'

/**
 * Preview a stored application document. Files are fetched with the
 * bearer token and shown from a temporary object URL.
 *
 * Use `embedded` to render the preview inside another dialog.
 */
export default function DocumentPreview({ document, onClose, embedded = false }) {
  // Keyed by document id so a previously opened file is never shown
  // under a different document's name.
  const [file, setFile] = useState({ id: null, url: '', error: '' })
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const objectUrlRef = useRef('')

  useEffect(() => {
    if (!document) {
      return undefined
    }

    let active = true

    fetchDocumentBlob(document)
      .then((blob) => {
        if (!active) {
          return
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
        }

        const objectUrl = URL.createObjectURL(new Blob([blob], { type: document.mime_type || blob.type }))
        objectUrlRef.current = objectUrl
        setFile({ id: document.id, url: objectUrl, error: '' })
      })
      .catch((exception) => {
        if (active) {
          setFile({
            id: document.id,
            url: '',
            error: getErrorMessage(exception, 'The document could not be opened.'),
          })
        }
      })

    return () => {
      active = false
    }
  }, [document])

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    },
    [],
  )

  if (!document) {
    return null
  }

  const loaded = file.id === document.id
  const loading = !loaded
  const objectUrl = loaded ? file.url : ''
  const error = (loaded ? file.error : '') || downloadError

  const isImage = (document.mime_type || '').startsWith('image/')
  const isPdf = document.mime_type === 'application/pdf'

  const download = async () => {
    setDownloading(true)
    setDownloadError('')

    try {
      const blob = await fetchDocumentBlob(document, { download: true })
      saveBlob(blob, document.original_name)
    } catch (exception) {
      setDownloadError(getErrorMessage(exception, 'The document could not be downloaded.'))
    } finally {
      setDownloading(false)
    }
  }

  const content = (
    <>
      <dl className="detail-list">
        <div>
          <dt>File name</dt>
          <dd>{document.original_name}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{formatDate(document.uploaded_at, { hour: 'numeric', minute: '2-digit' })}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>
            <span className={`badge badge--${document.review_status === 'approved' ? 'success' : document.review_status === 'rejected' ? 'danger' : 'warning'}`}>
              {humanizeStatus(document.review_status)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{document.human_size}</dd>
        </div>
      </dl>

      {document.review_remarks ? (
        <div className="alert alert--info" role="status">
          <div className="alert__body">
            <strong className="alert__title">Review remarks</strong>
            <p className="alert__text">{document.review_remarks}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert--error" role="alert">
          <div className="alert__body">
            <p className="alert__text">{error}</p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="empty-state">Loading document…</p>
      ) : isImage && objectUrl ? (
        <img className="doc-preview" src={objectUrl} alt={document.document_type} />
      ) : isPdf && objectUrl ? (
        <iframe className="doc-preview" src={objectUrl} title={document.document_type} />
      ) : objectUrl ? (
        <p className="empty-state">
          This file type cannot be previewed in the browser. Use Download to open it locally.
        </p>
      ) : null}
    </>
  )

  if (embedded) {
    return (
      <>
        {content}
        <div className="row-actions">
          <Button variant="secondary" onClick={download} loading={downloading}>
            Download file
          </Button>
        </div>
      </>
    )
  }

  return (
    <Modal
      open
      wide
      title={document.document_type}
      onClose={onClose}
      footer={
        <div className="row-actions">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={download} loading={downloading}>
            Download
          </Button>
        </div>
      }
    >
      {content}
    </Modal>
  )
}
