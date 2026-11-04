export default function TextareaField({ id, label, hint, error, required = false, rows = 3, ...rest }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="field__required"> *</span> : null}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={`field__input field__input--textarea${error ? ' field__input--invalid' : ''}`}
        required={required}
        {...rest}
      />
      {hint && !error ? <p className="field__hint">{hint}</p> : null}
      {error ? <p className="field__error">{error}</p> : null}
    </div>
  )
}
