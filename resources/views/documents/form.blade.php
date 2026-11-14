<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $template?->title ?: 'Application Form' }}</title>
    <style>
        @page { margin: 36px 42px; }
        body { font-family: "DejaVu Sans", sans-serif; font-size: 10px; color: #16324f; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 14px; }
        .eyebrow { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: #5a6b7c; }
        h1 { font-size: 16px; letter-spacing: 1px; text-transform: uppercase; margin: 8px 0 2px; }
        .reference { text-align: center; font-family: "DejaVu Sans Mono", monospace; font-size: 9px; margin-bottom: 12px; }
        .intro { text-align: justify; margin-bottom: 14px; }
        h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8a6a1f; margin: 16px 0 6px; border-bottom: 1px solid #c7a24b; padding-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; }
        table.fields td { border: 1px solid #d5dde6; padding: 6px 8px; vertical-align: top; }
        table.fields td.label { width: 32%; background: #f5f7fa; color: #5a6b7c; text-transform: uppercase; font-size: 8px; letter-spacing: 0.6px; }
        table.fields td.value { font-weight: bold; }
        ol.requirements { margin: 0; padding-left: 16px; }
        ol.requirements li { margin-bottom: 3px; }
        .signatures { width: 100%; margin-top: 40px; }
        .signatures td { width: 50%; text-align: center; vertical-align: bottom; padding-top: 36px; }
        .signature-line { border-top: 1px solid #16324f; padding-top: 5px; font-weight: bold; }
        .signature-role { font-size: 8px; color: #5a6b7c; text-transform: uppercase; letter-spacing: 0.8px; }
        .footer { margin-top: 24px; border-top: 1px dashed #c7a24b; padding-top: 8px; text-align: center; font-size: 8px; color: #5a6b7c; }
    </style>
</head>
<body>
    <div class="header">
        @if ($template?->logoAbsolutePath())
            <div><img src="{{ $template->logoAbsolutePath() }}" alt="Logo" style="max-height:64px;"></div>
        @endif

        @if (filled($template?->header_text))
            @foreach (preg_split('/\r\n|\r|\n/', $template->header_text) as $line)
                <div class="eyebrow">{{ $line }}</div>
            @endforeach
        @else
            <div class="eyebrow">{{ $office }}</div>
        @endif

        <h1>{{ $template?->title ?: $application->typeLabel().' Application Form' }}</h1>
    </div>

    <div class="reference">
        Application {{ $application->reference_number }} &middot; Filed
        {{ $application->submitted_at?->format($template?->date_format ?: 'F j, Y') ?? '—' }}
    </div>

    @if (filled($template?->statements))
        <p class="intro">{!! nl2br(e($template->renderStatements($statementVars))) !!}</p>
    @endif

    <h2>Franchise holder</h2>
    <table class="fields">
        <tr>
            <td class="label">Full name</td>
            <td class="value">{{ $franchisee?->full_name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Complete address</td>
            <td class="value">
                {{ trim(implode(', ', array_filter([$franchisee?->address, $franchisee?->barangay, $franchisee?->city_municipality, $franchisee?->province]))) ?: '—' }}
            </td>
        </tr>
        <tr>
            <td class="label">Contact number</td>
            <td class="value">{{ $franchisee?->contact_number ?? '—' }}</td>
        </tr>
    </table>

    <h2>Franchise and motor unit</h2>
    <table class="fields">
        <tr>
            <td class="label">Franchise number</td>
            <td class="value">{{ $franchise?->franchise_number ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Current motor unit</td>
            <td class="value">{{ $vehicle_label }}</td>
        </tr>
        <tr>
            <td class="label">Registration / expiry</td>
            <td class="value">
                {{ $franchise?->date_issued?->format($template?->date_format ?: 'F j, Y') ?? '—' }}
                &mdash;
                {{ $franchise?->expiration_date?->format($template?->date_format ?: 'F j, Y') ?? '—' }}
            </td>
        </tr>
    </table>

    @if ($application->application_type === \App\Models\Application::TYPE_TRANSFER && $application->transferDetail)
        <h2>Proposed new owner</h2>
        <table class="fields">
            <tr>
                <td class="label">New owner</td>
                <td class="value">{{ $application->transferDetail->newOwnerFullName() }}</td>
            </tr>
            <tr>
                <td class="label">Contact number</td>
                <td class="value">{{ $application->transferDetail->new_owner_contact ?? '—' }}</td>
            </tr>
        </table>
    @endif

    @if ($application->application_type === \App\Models\Application::TYPE_CHANGE_MOTOR && $application->vehicleChange)
        <h2>Proposed replacement unit</h2>
        <table class="fields">
            <tr>
                <td class="label">Plate number</td>
                <td class="value">{{ $application->vehicleChange->proposed_plate_number ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Motor number</td>
                <td class="value">{{ $application->vehicleChange->proposed_motor_number ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Chassis number</td>
                <td class="value">{{ $application->vehicleChange->proposed_chassis_number ?? '—' }}</td>
            </tr>
        </table>
    @endif

    <h2>Documentary requirements</h2>
    <ol class="requirements">
        @forelse ($requirements as $requirement)
            <li>
                {{ $requirement->name }}
                @if (! $requirement->is_required)
                    <em>(optional)</em>
                @endif
            </li>
        @empty
            <li>No requirements configured for this application type.</li>
        @endforelse
    </ol>

    <table class="signatures">
        <tr>
            <td>
                <div class="signature-line">{{ $franchisee?->full_name ?? '&nbsp;' }}</div>
                <div class="signature-role">Applicant &middot; Signature over printed name</div>
            </td>
            <td>
                <div class="signature-line">{{ $template?->signatory_name ?: '&nbsp;' }}</div>
                <div class="signature-role">{{ $template?->signatory_position ?: 'Received by' }}</div>
            </td>
        </tr>
    </table>

    <div class="footer">
        @if (filled($template?->footer_text))
            <div>{{ $template->footer_text }}</div>
        @endif
        {{ $application->reference_number }} &middot; Generated by TrikeTrack on {{ $generated_at }}
    </div>
</body>
</html>
