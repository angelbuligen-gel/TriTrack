<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Franchise;
use App\Models\SystemSetting;
use App\Services\ReportExporter;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\HttpFoundation\Response;

/**
 * Registers required by the BPLO reporting section: franchise records,
 * driver records and franchises nearing expiration. All three share the
 * same table builder so the on-screen report, the PDF and the Excel file
 * always contain identical rows.
 */
class RecordReportController extends Controller
{
    private const REPORTS = ['franchises', 'drivers', 'expiring'];

    public function __construct(private readonly ReportExporter $exporter) {}

    public function show(Request $request, string $report): JsonResponse
    {
        $table = $this->table($report, $request);

        return ApiResponse::success([
            'report' => $report,
            'title' => $table['title'],
            'headers' => $table['headers'],
            'rows' => $table['rows'],
        ], 'Report generated successfully.');
    }

    public function export(Request $request, string $report): Response
    {
        $table = $this->table($report, $request);
        $period = $this->period($request);
        $filename = $report.'-'.$period['from'].'-to-'.$period['to'];

        if ($request->string('format')->toString() === 'excel') {
            return $this->exporter->excel(
                $table['title'],
                $table['headers'],
                array_map(fn (array $row) => array_values($row), $table['rows']),
                [],
                [['Total records', count($table['rows'])]],
                $filename.'.xls',
            );
        }

        return $this->exporter->pdf('reports.table', [
            'title' => $table['title'],
            'headers' => $table['headers'],
            'rows' => array_map(fn (array $row) => array_values($row), $table['rows']),
            'period' => $period,
            'office' => $this->officeName(),
            'generated_at' => now()->toDateTimeString(),
        ], $filename.'.pdf');
    }

    public function sendReminders(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $days = $validated['days'] ?? (int) (SystemSetting::query()
            ->where('key', 'renewal_reminder_days')->value('value') ?: 30);

        Artisan::call('franchises:send-renewal-reminders', ['--days' => $days]);

        return ApiResponse::success(
            ['days' => $days, 'output' => trim(Artisan::output())],
            'Renewal reminders processed.',
        );
    }

    /**
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<string, mixed>>}
     */
    private function table(string $report, Request $request): array
    {
        abort_unless(in_array($report, self::REPORTS, true), 404, 'Unknown report.');

        return match ($report) {
            'franchises' => $this->franchises($request),
            'drivers' => $this->drivers($request),
            'expiring' => $this->expiring($request),
        };
    }

    /**
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<string, mixed>>}
     */
    private function franchises(Request $request): array
    {
        $rows = Franchise::query()
            ->with(['franchisee', 'activeVehicle'])
            ->search($request->string('q')->toString() ?: null)
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('franchise_status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('expiration_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('expiration_date', '<=', $request->date('to')))
            ->orderBy('franchise_number')
            ->limit(5000)
            ->get()
            ->map(fn (Franchise $franchise) => [
                'franchise_number' => $franchise->franchise_number,
                'owner' => $franchise->franchisee?->full_name ?? '—',
                'barangay' => $franchise->franchisee?->barangay ?? '—',
                'plate_number' => $franchise->activeVehicle?->plate_number ?? '—',
                'motor_number' => $franchise->activeVehicle?->motor_number ?? '—',
                'date_issued' => $franchise->date_issued?->toDateString() ?? '—',
                'expiration_date' => $franchise->expiration_date?->toDateString() ?? '—',
                'status' => $franchise->franchise_status,
                'days_remaining' => $this->daysRemaining($franchise),
            ])
            ->all();

        return [
            'title' => 'Franchise record register',
            'headers' => ['Franchise', 'Owner', 'Barangay', 'Plate', 'Motor no.', 'Issued', 'Expires', 'Status', 'Days left'],
            'rows' => $rows,
        ];
    }

    /**
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<string, mixed>>}
     */
    private function drivers(Request $request): array
    {
        $rows = Driver::query()
            ->with('currentFranchises')
            ->search($request->string('q')->toString() ?: null)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(5000)
            ->get()
            ->map(fn (Driver $driver) => [
                'name' => $driver->full_name,
                'license_number' => $driver->license_number ?? '—',
                'license_expiry' => $driver->license_expiry?->toDateString() ?? '—',
                'contact_number' => $driver->contact_number ?? '—',
                'address' => $driver->address ?? '—',
                'franchises' => $driver->currentFranchises->pluck('franchise_number')->implode(', ') ?: 'Unassigned',
                'license_status' => $driver->hasExpiredLicense() ? 'Expired' : 'Valid',
            ])
            ->all();

        return [
            'title' => 'Driver record register',
            'headers' => ['Driver', 'License no.', 'License expiry', 'Contact', 'Address', 'Franchise', 'License status'],
            'rows' => $rows,
        ];
    }

    /**
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<string, mixed>>}
     */
    private function expiring(Request $request): array
    {
        $days = (int) ($request->input('days') ?: 60);

        $rows = Franchise::query()
            ->with(['franchisee'])
            ->whereIn('franchise_status', [Franchise::STATUS_ACTIVE, Franchise::STATUS_FOR_RENEWAL])
            ->whereNotNull('expiration_date')
            ->whereBetween('expiration_date', [
                now()->startOfDay()->toDateString(),
                now()->startOfDay()->addDays($days)->toDateString(),
            ])
            ->orderBy('expiration_date')
            ->limit(5000)
            ->get()
            ->map(fn (Franchise $franchise) => [
                'franchise_number' => $franchise->franchise_number,
                'owner' => $franchise->franchisee?->full_name ?? '—',
                'contact_number' => $franchise->franchisee?->contact_number ?? '—',
                'expiration_date' => $franchise->expiration_date?->toDateString() ?? '—',
                'days_remaining' => $this->daysRemaining($franchise),
                'status' => $franchise->franchise_status,
                'reminder_sent' => $franchise->renewal_reminder_sent_at?->toDateString() ?? 'Not sent',
            ])
            ->all();

        return [
            'title' => "Franchises expiring within {$days} days",
            'headers' => ['Franchise', 'Owner', 'Contact', 'Expires', 'Days left', 'Status', 'Reminder sent'],
            'rows' => $rows,
        ];
    }

    private function daysRemaining(Franchise $franchise): int|string
    {
        if ($franchise->expiration_date === null) {
            return '—';
        }

        return (int) now()->startOfDay()->diffInDays($franchise->expiration_date->copy()->startOfDay(), false);
    }

    /**
     * @return array{from: string, to: string}
     */
    private function period(Request $request): array
    {
        return [
            'from' => ($request->date('from') ?? now()->startOfYear())->toDateString(),
            'to' => ($request->date('to') ?? now())->toDateString(),
        ];
    }

    private function officeName(): string
    {
        $office = SystemSetting::query()->where('key', 'office_name')->value('value');
        $municipality = SystemSetting::query()->where('key', 'municipality_name')->value('value');

        return trim(($office ? $office.', ' : '').($municipality ?? ''), ', ') ?: config('app.name');
    }
}
