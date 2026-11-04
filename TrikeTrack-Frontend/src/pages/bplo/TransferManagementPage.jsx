import ApplicationTypeQueue from '../../components/ApplicationTypeQueue'

export default function TransferManagementPage() {
  return (
    <ApplicationTypeQueue
      type="transfer"
      eyebrow="Transfer"
      title="Franchise transfer applications"
      text="Review ownership transfers, verify the transferee's requirements, and finalize the franchise reassignment."
      emptyMessage="No transfer applications match this filter."
      detailLabel="Transfer"
      extraColumn={{
        label: 'Proposed owner',
        render: (row) => row.transfer_detail?.new_owner?.full_name || '-',
      }}
    />
  )
}
