import Button from './Button'
import Modal from './Modal'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="panel__text">{message}</p>
    </Modal>
  )
}
