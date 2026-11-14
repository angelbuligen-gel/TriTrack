<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Template preview</title>
    <style>
        @page { margin: 40px 48px; }
        body { font-family: "DejaVu Sans", sans-serif; font-size: 11px; color: #16324f; line-height: 1.55; }
        .frame { border: 2px solid #16324f; padding: 34px 38px; }
        .header { text-align: center; }
        .eyebrow { font-size: 9px; letter-spacing: 1.8px; text-transform: uppercase; color: #5a6b7c; }
        h1 { font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin: 10px 0 4px; }
        .intro { text-align: justify; margin-top: 18px; }
        .muted { color: #5a6b7c; font-size: 9px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        table td { border-bottom: 1px solid #e2e8ef; padding: 7px 6px; }
        table td.label { width: 34%; color: #5a6b7c; text-transform: uppercase; font-size: 8px; letter-spacing: 0.8px; }
        .signatures { width: 100%; margin-top: 44px; }
        .signatures td { width: 50%; text-align: center; vertical-align: bottom; padding-top: 30px; border: 0; }
        .signature-line { border-top: 1px solid #16324f; padding-top: 5px; font-weight: bold; }
        .signature-role { font-size: 8px; color: #5a6b7c; text-transform: uppercase; letter-spacing: 0.8px; }
        .footer { margin-top: 26px; border-top: 1px dashed #c7a24b; padding-top: 8px; text-align: center; font-size: 8px; color: #5a6b7c; }
    </style>
</head>
<body>
    <div class="frame">
        <div class="header">
            @if ($template->logoAbsolutePath())
                <div><img src="{{ $template->logoAbsolutePath() }}" alt="Logo" style="max-height:70px;"></div>
            @endif

            @if (filled($template->header_text))
                @foreach (preg_split('/\r\n|\r|\n/', $template->header_text) as $line)
                    <div class="eyebrow">{{ $line }}</div>
                @endforeach
            @endif

            <h1>{{ $template->title ?: $template->name }}</h1>
            <div class="muted">{{ $template->label() }} &middot; sample preview</div>
        </div>

        @if (filled($template->statements))
            <p class="intro">{!! nl2br(e($template->renderStatements($vars))) !!}</p>
        @endif

        <table>
            <tr>
                <td class="label">Franchise holder</td>
                <td>{{ $vars['franchisee'] }}</td>
            </tr>
            <tr>
                <td class="label">Franchise number</td>
                <td>{{ $vars['franchise_number'] }}</td>
            </tr>
            <tr>
                <td class="label">Application</td>
                <td>{{ $vars['application_reference'] }}</td>
            </tr>
            <tr>
                <td class="label">Motor unit</td>
                <td>{{ $vars['vehicle'] }}</td>
            </tr>
        </table>

        <table class="signatures">
            <tr>
                <td>
                    <div class="signature-line">{{ $template->signatory_name ?: '&nbsp;' }}</div>
                    <div class="signature-role">{{ $template->signatory_position ?: 'Signatory' }}</div>
                </td>
                <td>
                    <div class="signature-line">&nbsp;</div>
                    <div class="signature-role">Business Permits and Licensing Office</div>
                </td>
            </tr>
        </table>

        <div class="footer">
            @if (filled($template->footer_text))
                <div>{{ $template->footer_text }}</div>
            @endif
            Preview generated {{ $generated_at }} &middot; sample data only.
        </div>
    </div>
</body>
</html>
