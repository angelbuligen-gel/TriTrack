<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Payment Collection Report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 7.5px; color: #111; }
        h1 { font-size: 13px; margin: 0 0 2px; }
        h2 { font-size: 9px; margin: 10px 0 3px; text-transform: uppercase; letter-spacing: 0.4px; }
        .muted { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th, td { border: 1px solid #999; padding: 2px 3px; vertical-align: top; }
        th { background: #eef1f7; text-align: left; }
        .num { text-align: right; white-space: nowrap; }
        .totals td { font-weight: bold; background: #f7f7f7; }
        .narrow { width: 42%; }
    </style>
</head>
<body>
    <h1>{{ $office }}</h1>
    <div class="muted">
        Payment Collection Report &middot; {{ $period['from'] }} to {{ $period['to'] }}
        &middot; generated {{ $generated_at }}
    </div>

    <h2>Summary</h2>
    <table class="narrow">
        <tr><td>Total transactions</td><td class="num">{{ $totals['transactions'] }}</td></tr>
        <tr><td>Verified transactions</td><td class="num">{{ $totals['verified_transactions'] }}</td></tr>
        <tr><td>Pending transactions</td><td class="num">{{ $totals['pending_transactions'] }}</td></tr>
        <tr><td>Failed / cancelled</td><td class="num">{{ $totals['failed_transactions'] }}</td></tr>
        <tr><td>Cash collections</td><td class="num">{{ number_format($totals['cash_total'], 2) }}</td></tr>
        <tr><td>QR / online collections</td><td class="num">{{ number_format($totals['qr_total'], 2) }}</td></tr>
        <tr><td>Total collected</td><td class="num">{{ number_format($totals['collected_total'], 2) }}</td></tr>
        <tr><td>Total pending</td><td class="num">{{ number_format($totals['pending_total'], 2) }}</td></tr>
    </table>

    <h2>Transaction breakdown</h2>
    <table>
        <thead>
            <tr>
                <th>Date / time</th>
                <th>Transaction</th>
                <th>Franchise</th>
                <th>Franchisee</th>
                <th>Type</th>
                <th>Assessment</th>
                <th class="num">Regular</th>
                <th class="num">Violation</th>
                <th class="num">Total due</th>
                <th class="num">Paid</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Verified by</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($transactions as $row)
                <tr>
                    <td>{{ $row['paid_at'] }}</td>
                    <td>{{ $row['transaction_number'] }}</td>
                    <td>{{ $row['franchise_number'] ?? '-' }}</td>
                    <td>{{ $row['franchisee_name'] ?? '-' }}</td>
                    <td>{{ $row['application_type_label'] ?? '-' }}</td>
                    <td>{{ $row['assessment_number'] ?? '-' }}</td>
                    <td class="num">{{ number_format($row['regular_fee'], 2) }}</td>
                    <td class="num">{{ number_format($row['violation_fee'], 2) }}</td>
                    <td class="num">{{ number_format($row['total_amount_due'], 2) }}</td>
                    <td class="num">{{ number_format($row['amount_paid'], 2) }}</td>
                    <td>{{ $row['method'] ?: 'online' }}</td>
                    <td>{{ $row['payment_reference'] ?? '-' }}</td>
                    <td>{{ $row['status'] }}</td>
                    <td>{{ $row['verified_by'] ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="14">No payments match the selected filters.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <h2>Totals by payment method</h2>
    <table class="narrow">
        <thead>
            <tr><th>Method</th><th class="num">Transactions</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>
            @foreach ($by_method as $row)
                <tr>
                    <td>{{ $row['method'] }}</td>
                    <td class="num">{{ $row['count'] }}</td>
                    <td class="num">{{ number_format($row['total'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Totals by application type</h2>
    <table class="narrow">
        <thead>
            <tr><th>Application type</th><th class="num">Transactions</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>
            @foreach ($by_application_type as $row)
                <tr>
                    <td>{{ $row['application_type'] }}</td>
                    <td class="num">{{ $row['count'] }}</td>
                    <td class="num">{{ number_format($row['total'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
