<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $certificate->certificate_number }}</title>
    <style>
        @page { margin: 40px 48px; }
        * { box-sizing: border-box; }
        body {
            font-family: "DejaVu Sans", sans-serif;
            color: #16324f;
            font-size: 12px;
            line-height: 1.55;
        }
        .frame {
            border: 2px solid #16324f;
            padding: 40px 44px;
            position: relative;
        }
        .frame:before {
            content: "";
            position: absolute;
            top: 8px; left: 8px; right: 8px; bottom: 8px;
            border: 1px solid #c7a24b;
        }
        .content { position: relative; }
        .eyebrow {
            text-align: center;
            font-size: 10px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #5a6b7c;
        }
        h1 {
            text-align: center;
            font-size: 26px;
            letter-spacing: 3px;
            margin: 6px 0 2px;
            text-transform: uppercase;
        }
        h2 {
            text-align: center;
            font-size: 15px;
            font-weight: normal;
            margin: 0 0 26px;
            color: #8a6a1f;
        }
        .number {
            text-align: center;
            font-family: "DejaVu Sans Mono", monospace;
            font-size: 12px;
            margin-bottom: 24px;
        }
        .lead { text-align: justify; margin-bottom: 20px; }
        .lead strong { color: #16324f; }
        table.details {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 22px;
        }
        table.details td {
            border-bottom: 1px solid #e2e8ef;
            padding: 8px 6px;
            vertical-align: top;
        }
        table.details td.label {
            width: 34%;
            color: #5a6b7c;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 1px;
        }
        table.details td.value { font-weight: bold; }
        .validity {
            background: #f5f7fa;
            border-left: 4px solid #c7a24b;
            padding: 12px 16px;
            margin-bottom: 26px;
        }
        .validity span { display: block; }
        .validity .dates { font-size: 14px; font-weight: bold; margin-top: 2px; }
        .signatures { width: 100%; margin-top: 40px; }
        .signatures td { width: 50%; text-align: center; vertical-align: bottom; padding-top: 34px; }
        .signature-line {
            border-top: 1px solid #16324f;
            padding-top: 6px;
            font-weight: bold;
        }
        .signature-role { font-size: 9px; color: #5a6b7c; text-transform: uppercase; letter-spacing: 1px; }
        .footer {
            margin-top: 30px;
            border-top: 1px dashed #c7a24b;
            padding-top: 10px;
            text-align: center;
            font-size: 9px;
            color: #5a6b7c;
        }
    </style>
</head>
<body>
    <div class="frame">
        <div class="content">
            <div class="eyebrow">Republic of the Philippines</div>
            <div class="eyebrow">Local Government Unit &middot; Business Permits and Licensing Office</div>

            <h1>Certificate</h1>
            <h2>{{ $certificate->typeLabel() }}</h2>

            <div class="number">Certificate No. {{ $certificate->certificate_number }}</div>

            <p class="lead">
                This certifies that <strong>{{ $franchisee?->full_name ?? 'Registered franchise holder' }}</strong>,
                holder of <strong>Franchise No. {{ $franchise?->franchise_number ?? '—' }}</strong>, has complied with the
                requirements of the Local Government Unit for a
                {{ strtolower($certificate->typeLabel()) }} under application
                <strong>{{ $application->reference_number }}</strong>.
            </p>

            <table class="details">
                <tr>
                    <td class="label">Franchise holder</td>
                    <td class="value">{{ $franchisee?->full_name ?? '—' }}</td>
                </tr>
                <tr>
                    <td class="label">Franchise number</td>
                    <td class="value">{{ $franchise?->franchise_number ?? '—' }}</td>
                </tr>
                @if ($application->application_type === \App\Models\Application::TYPE_TRANSFER && $application->transferDetail)
                    <tr>
                        <td class="label">Previous owner</td>
                        <td class="value">{{ $application->franchisee?->full_name ?? '—' }}</td>
                    </tr>
                    <tr>
                        <td class="label">New owner</td>
                        <td class="value">{{ $application->transferDetail->newOwnerFullName() }}</td>
                    </tr>
                @endif
                <tr>
                    <td class="label">Motor unit</td>
                    <td class="value">
                        @if ($vehicle['plate_number'] || $vehicle['motor_number'])
                            {{ $vehicle['plate_number'] ?? 'No plate' }}
                            &middot; Motor No. {{ $vehicle['motor_number'] ?? '—' }}
                            @if ($vehicle['make'] || $vehicle['model'])
                                &middot; {{ trim(($vehicle['make'] ?? '').' '.($vehicle['model'] ?? '')) }}
                            @endif
                        @else
                            —
                        @endif
                    </td>
                </tr>
                @if ($application->coverage_year)
                    <tr>
                        <td class="label">Coverage year</td>
                        <td class="value">{{ $application->coverage_year }}</td>
                    </tr>
                @endif
                <tr>
                    <td class="label">Date issued</td>
                    <td class="value">{{ \Illuminate\Support\Carbon::parse($certificate->issued_at)->format('F j, Y') }}</td>
                </tr>
            </table>

            <div class="validity">
                <span class="signature-role">Validity</span>
                <span class="dates">
                    {{ \Illuminate\Support\Carbon::parse($valid_from)->format('F j, Y') }}
                    &mdash;
                    {{ $valid_until ? \Illuminate\Support\Carbon::parse($valid_until)->format('F j, Y') : 'Until revoked' }}
                </span>
            </div>

            <p class="lead" style="font-size: 10px;">
                This certificate is issued in accordance with the local franchise ordinance and remains valid only
                while the franchise is active, the motor unit remains registered, and all applicable fees are paid.
                Any transfer of ownership or change of motor unit requires prior approval from the Business Permits
                and Licensing Office.
            </p>

            <table class="signatures">
                <tr>
                    <td>
                        <div class="signature-line">{{ $issued_by ?? 'Authorized Personnel' }}</div>
                        <div class="signature-role">Issued by &middot; BPLO</div>
                    </td>
                    <td>
                        <div class="signature-line">&nbsp;</div>
                        <div class="signature-role">Attested by &middot; Local Chief Executive</div>
                    </td>
                </tr>
            </table>

            <div class="footer">
                {{ $certificate->certificate_number }} &middot; Generated by TrikeTrack on
                {{ now()->format('F j, Y g:i A') }} &middot; Verify authenticity with the BPLO.
            </div>
        </div>
    </div>
</body>
</html>
