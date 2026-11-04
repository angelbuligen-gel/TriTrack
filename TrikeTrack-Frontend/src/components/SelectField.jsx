export default function SelectField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  ...rest
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="field__required"> *</span> : null}
      </label>
      <select id={id} className={`field__input${error ? ' field__input--invalid' : ''}`} required={required} {...rest}>
        {children}
      </select>
      {hint && !error ? (
        <p className="field__hint">{hint}</p>
      ) : null}
      {error ? (
        <p className="field__error">{error}</p>
      ) : null}
    </div>
  )
}
