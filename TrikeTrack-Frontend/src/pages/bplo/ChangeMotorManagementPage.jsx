import ApplicationTypeQueue from '../../components/ApplicationTypeQueue'

export default function ChangeMotorManagementPage() {
  return (
    <ApplicationTypeQueue
      type="change_motor"
      eyebrow="Change Motor"
      title="Motor change applications"
      text="Validate the replacement unit, its documents, and the corresponding fee before approving a motor change."
      emptyMessage="No motor change applications match this filter."
      detailLabel="Motor change"
      extraColumn={{
        label: 'Replacement unit',
        render: (row) =>
          row.vehicle_change?.proposed
            ? `${row.vehicle_change.proposed.motor_number || 'No motor no.'} - ${row.vehicle_change.proposed.plate_number || 'No plate'}`
            : '-',
      }}
    />
  )
}
