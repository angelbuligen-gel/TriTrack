<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $payment->reference_number }}</title>
    <style>
        @page { margin: 26px 30px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #16324f; line-height: 1.5; }
        .head { text-align: center; border-bottom: 2px solid #c7a24b; padding-bottom: 8px; margin-bottom: 10px; }
        .head .office { font-size: 10px; font-weight: bold; }
        .head .muted { font-size: 8px; color: #5a6b7c; }
        h1 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 2px; }
        .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .meta td { padding: 3px 0; vertical-align: top; }
        .meta td.label { width: 38%; color: #5a6b7c; text-transform: uppercase; font-size: 7px; letter-spacing: 0.7px; }
        table.items { width: 100%; border-collapse: collapse; margin: 6px 0; }
        table.items th, table.items td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        table.items th { background: #f1f5f9; text-align: left; font-size: 8px; }
        .num { text-align: right; white-space: nowrap; }
        .total { font-size: 11px; font-weight: bold; }
        .footer { margin-top: 14px; border-top: 1px dashed #c7a24b; padding-top: 6px; text-align: center; font-size: 7px; color: #5a6b7c; }
        .signature { margin-top: 22px; text-align: center; }
        .signature .line { border-top: 1px solid #16324f; margin: 0 20px; padding-top: 4px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="head">
        <div class="office">{{ $office }}</div>
        <div class="muted">Republic of the Philippines</div>
        <h1>Official Receipt</h1>
        <div class="muted">Receipt No. {{ $payment->reference_number }}</div>
    </div>

    <table class="meta">
        <tr>
            <td class="label">Transaction number</td>
            <td>{{ $payment->reference_number }}</td>
        </tr>
        <tr>
            <td class="label">Franchise number</td>
            <td>{{ $franchise?->franchise_number ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Franchisee</td>
            <td>{{ $franchisee?->full_name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Application type</td>
            <td>{{ $application?->typeLabel() ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Application reference</td>
            <td>{{ $application?->reference_number ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Assessment number</td>
            <td>{{ $assessment?->assessment_number ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Payment date</td>
            <td>{{ ($payment->paid_at ?? $payment->created_at)?->format('F j, Y g:i A') }}</td>
        </tr>
        <tr>
            <td class="label">Payment method</td>
            <td>{{ ucfirst($payment->method ?? $payment->provider) }}</td>
        </tr>
        <tr>
            <td class="label">Payment reference</td>
            <td>{{ $payment->provider_reference ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Verified by</td>
            <td>{{ $payment->verifiedBy?->name ?? '—' }}</td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Particulars</th>
                <th class="num">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="num">{{ number_format((float) $item->amount, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td>{{ $application?->typeLabel() ?? 'Franchise fee' }}</td>
                    <td class="num">{{ number_format((float) $payment->amount, 2) }}</td>
                </tr>
            @endforelse
            <tr>
                <td class="total">TOTAL AMOUNT PAID</td>
                <td class="num total">PHP {{ number_format((float) $payment->amount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="signature">
        <div class="line">{{ $payment->verifiedBy?->name ?? 'Authorized Personnel' }}</div>
        <div class="muted">Collecting Officer / Treasury Personnel</div>
    </div>

    <div class="footer">
        {{ $payment->reference_number }} &middot; Issued {{ $generated_at }} &middot; Keep this receipt for your records.
    </div>
</body>
</html>
