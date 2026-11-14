<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renders reports as a PDF (DomPDF) or as a SpreadsheetML workbook that
 * Microsoft Excel opens natively. Kept dependency-free so every report
 * shares the same layout rules.
 */
class ReportExporter
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function pdf(string $view, array $data, string $filename): Response
    {
        $pdf = Pdf::loadView($view, $data)->setPaper('a4', 'landscape');

        return $pdf->download($filename);
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     * @param  array<int, int>  $moneyColumns  zero-based indexes formatted as currency
     * @param  array<int, array{0: string, 1: mixed}>  $summary
     */
    public function excel(
        string $title,
        array $headers,
        array $rows,
        array $moneyColumns = [],
        array $summary = [],
        string $filename = 'report.xls',
    ): Response {
        $columns = '';

        foreach ($headers as $header) {
            $columns .= '<Column ss:AutoFitWidth="0" ss:Width="130"/>';
        }

        $titleRow = $this->row([[$title, 'String', 'title']]);

        $headerRow = $this->row(array_map(
            fn (string $header) => [$header, 'String', 'header'],
            $headers,
        ));

        $bodyRows = '';

        foreach ($rows as $row) {
            $cells = [];

            foreach (array_values($row) as $index => $value) {
                if ($value === null || $value === '') {
                    $cells[] = ['', 'String', null];
                } elseif (is_numeric($value)) {
                    $cells[] = [
                        (string) $value,
                        'Number',
                        in_array($index, $moneyColumns, true) ? 'money' : null,
                    ];
                } else {
                    $cells[] = [(string) $value, 'String', null];
                }
            }

            $bodyRows .= $this->row($cells);
        }

        $summaryRows = '';

        if ($summary !== []) {
            $summaryRows .= '<Row></Row>';

            foreach ($summary as $line) {
                $summaryRows .= $this->row([
                    [$line[0], 'String', 'summaryLabel'],
                    [is_numeric($line[1]) ? (string) $line[1] : (string) $line[1], is_numeric($line[1]) ? 'Number' : 'String', 'summaryValue'],
                ]);
            }
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<?mso-application progid="Excel.Sheet"?>'."\n"
            .'<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" '
            .'xmlns:o="urn:schemas-microsoft-com:office:office" '
            .'xmlns:x="urn:schemas-microsoft-com:office:excel" '
            .'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
            .'<Styles>'
            .'<Style ss:ID="title"><Font ss:Bold="1" ss:Size="14"/></Style>'
            .'<Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#DDEBF7" ss:Pattern="Solid"/></Style>'
            .'<Style ss:ID="money"><NumberFormat ss:Format="#,##0.00"/></Style>'
            .'<Style ss:ID="summaryLabel"><Font ss:Bold="1"/></Style>'
            .'<Style ss:ID="summaryValue"><Font ss:Bold="1"/></Style>'
            .'</Styles>'
            .'<Worksheet ss:Name="Report"><Table>'.$columns
            .$titleRow.$headerRow.$bodyRows.$summaryRows
            .'</Table></Worksheet></Workbook>';

        return response($xml, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  array<int, array{0: string, 1: string, 2: string|null}>  $cells
     */
    private function row(array $cells): string
    {
        $xml = '<Row>';

        foreach ($cells as [$value, $type, $style]) {
            $attribute = $style === null ? '' : ' ss:StyleID="'.$style.'"';

            $xml .= '<Cell'.$attribute.'><Data ss:Type="'.$type.'">'
                .htmlspecialchars((string) $value, ENT_QUOTES | ENT_XML1, 'UTF-8')
                .'</Data></Cell>';
        }

        return $xml.'</Row>';
    }
}
