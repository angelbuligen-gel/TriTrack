import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import './confirm.css'

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  )

function summaryHtml(details) {
  const rows = (details ?? []).filter(
    (row) => row && row.label && row.value !== '' && row.value !== null && row.value !== undefined,
  )

  if (!rows.length) {
    return ''
  }

  return `<dl class="tt-swal-summary">${rows
    .map((row) => `<dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd>`)
    .join('')}</dl>`
}

/**
 * Ask the user to confirm a create action before the request is sent.
 * Returns true only when the user confirms.
 */
export async function confirmCreate({
  entity,
  details = [],
  confirmButtonText = 'Yes, save record',
  cancelButtonText = 'Review again',
} = {}) {
  const result = await Swal.fire({
    title: `Create ${entity}?`,
    html: `${summaryHtml(details)}<p class="tt-swal-note">Please review the details above. The record is saved only after you confirm.</p>`,
    icon: 'question',
    iconColor: '#e0b02c',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: 'tt-swal',
      title: 'tt-swal__title',
      htmlContainer: 'tt-swal__body',
      confirmButton: 'tt-swal__confirm',
      cancelButton: 'tt-swal__cancel',
    },
    showClass: { popup: 'tt-swal-in' },
    hideClass: { popup: 'tt-swal-out' },
  })

  return result.isConfirmed
}

export default confirmCreate
