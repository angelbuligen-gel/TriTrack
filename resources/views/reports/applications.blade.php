<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Application Register</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8.5px; color: #111; }
        h1 { font-size: 13px; margin: 0 0 2px; }
        .muted { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 3px 4px; }
        th { background: #eef1f7; text-align: left; }
        .count { margin-top: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>{{ $office }}</h1>
    <div class="muted">
        Application Register &middot; {{ $period['from'] }} to {{ $period['to'] }}
        &middot; generated {{ $generated_at }}
    </div>

    <table>
        <thead>
            <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Franchise</th>
                <th>Franchisee</th>
                <th>Status</th>
                <th>Filed</th>
                <th>Decided</th>
                <th>Decided by</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    <td>{{ $row['reference_number'] }}</td>
                    <td>{{ $row['type'] }}</td>
                    <td>{{ $row['franchise_number'] ?? '-' }}</td>
                    <td>{{ $row['franchisee'] ?? '-' }}</td>
                    <td>{{ $row['status'] }}</td>
                    <td>{{ $row['submitted_at'] ?? '-' }}</td>
                    <td>{{ $row['decided_at'] ?? '-' }}</td>
                    <td>{{ $row['decided_by'] ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8">No applications were filed in this period.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p class="count">Total applications: {{ count($rows) }}</p>
</body>
</html>
