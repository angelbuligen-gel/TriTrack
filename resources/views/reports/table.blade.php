<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #111; }
        h1 { font-size: 13px; margin: 0 0 2px; }
        .muted { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 3px 4px; vertical-align: top; }
        th { background: #eef1f7; text-align: left; }
        .num { text-align: right; white-space: nowrap; }
        .count { margin-top: 8px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>{{ $office }}</h1>
    <div class="muted">
        {{ $title }} &middot; {{ $period['from'] }} to {{ $period['to'] }}
        &middot; generated {{ $generated_at }}
    </div>

    <table>
        <thead>
            <tr>
                @foreach ($headers as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ max(count($headers), 1) }}">No records match the selected filters.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p class="count">Total records: {{ count($rows) }}</p>
</body>
</html>
