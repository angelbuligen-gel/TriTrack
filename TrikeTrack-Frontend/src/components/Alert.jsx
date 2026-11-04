export default function Alert({ variant = 'error', title, children, onDismiss }) {
  if (!children && !title) {
    return null
  }

  return (
    <div className={`alert alert--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <div className="alert__body">
        {title ? <strong className="alert__title">{title}</strong> : null}
        {children ? <p className="alert__text">{children}</p> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="alert__close" onClick={onDismiss} aria-label="Dismiss message">
          &times;
        </button>
      ) : null}
    </div>
  )
}
