const DARK_VARIANTS = ['secondary', 'ghost', 'dark']

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  block = false,
  className = '',
  ...rest
}) {
  const extraClass = DARK_VARIANTS.includes(variant)
    ? ' btn--dark'
    : ''

  return (
    <button
      type={type}
      className={`btn btn--${variant}${block ? ' btn--block' : ''}${className ? ` ${className}` : ''}${extraClass}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}
