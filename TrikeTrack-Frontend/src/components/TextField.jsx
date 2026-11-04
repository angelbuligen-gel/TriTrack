export default function TextField({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  ...rest
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="field__required"> *</span> : null}
      </label>
      <input
        id={id}
        className={`field__input${error ? ' field__input--invalid' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        required={required}
        {...rest}
      />
      {hint && !error ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
