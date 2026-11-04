export default function PageHeader({ eyebrow, title, text, actions, badge }) {
  return (
    <header className="page-head page-head--compact">
      <div>
        {eyebrow ? <p className="page-head__eyebrow">{eyebrow}</p> : null}
        <h1 className="page-head__title">{title}</h1>
        {text ? <p className="page-head__text">{text}</p> : null}
      </div>
      <div className="page-head__actions">
        {badge}
        {actions}
      </div>
    </header>
  )
}
