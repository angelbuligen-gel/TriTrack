import { useEffect } from 'react'

export default function Modal({ open, title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={`modal${wide ? ' modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
