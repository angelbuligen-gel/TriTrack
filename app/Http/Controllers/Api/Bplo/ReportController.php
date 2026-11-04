<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Certificate;
use App\Models\Franchise;
use App\Models\Payment;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Operational reports for BPLO: application volume, status breakdowns,
 * franchise profiles, and certificate issuance.
 */
class ReportController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $from = $request->date('from') ?? now()->startOfYear();
        $to = $request->date('to') ?? now();

        $applications = Application::query()
            ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('submitted_at', '>=', $from))
            ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('submitted_at', '<=', $to));

        $byStatus = (clone $applications)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $byType = (clone $applications)
            ->select('application_type', DB::raw('COUNT(*) as total'))
            ->groupBy('application_type')
            ->pluck('total', 'application_type');

        $monthly = (clone $applications)
            ->selectRaw("DATE_FORMAT(submitted_at, '%Y-%m') as period, COUNT(*) as total")
            ->whereNotNull('submitted_at')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $franchisesByStatus = Franchise::query()
            ->select('franchise_status', DB::raw('COUNT(*) as total'))
            ->groupBy('franchise_status')
            ->pluck('total', 'franchise_status');

        $certificatesByType = Certificate::query()
            ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('issued_at', '>=', $from))
            ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('issued_at', '<=', $to))
            ->select('certificate_type', DB::raw('COUNT(*) as total'))
            ->groupBy('certificate_type')
            ->pluck('total', 'certificate_type');

        return ApiResponse::success([
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'applications' => [
                'total' => (clone $applications)->count(),
                'by_status' => $byStatus,
                'by_type' => $byType,
                'monthly' => $monthly,
                'approved' => (int) ($byStatus[Application::STATUS_APPROVED] ?? 0),
                'rejected' => (int) ($byStatus[Application::STATUS_REJECTED] ?? 0),
            ],
            'franchises' => [
                'total' => Franchise::query()->count(),
                'by_status' => $franchisesByStatus,
                'expiring_in_60_days' => Franchise::query()
                    ->whereBetween('expiration_date', [now()->toDateString(), now()->addDays(60)->toDateString()])
                    ->count(),
            ],
            'certificates' => [
                'total' => $certificatesByType->sum(),
                'by_type' => $certificatesByType,
            ],
            'collections' => [
                'total' => (float) Payment::query()
                    ->where('status', Payment::STATUS_SUCCESSFUL)
                    ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('paid_at', '>=', $from))
                    ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('paid_at', '<=', $to))
                    ->sum('amount'),
            ],
        ], 'Report generated successfully.');
    }

    public function applications(Request $request): JsonResponse
    {
        $paginated = Application::query()
            ->with(['franchise', 'franchisee', 'decidedBy'])
            ->when($request->filled('type'), fn (Builder $query) => $query
                ->where('application_type', $request->string('type')->toString()))
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('submitted_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('submitted_at', '<=', $request->date('to')))
            ->orderByDesc('submitted_at')
            ->paginate(min((int) $request->input('per_page', 50), 200));

        $rows = collect($paginated->items())->map(fn (Application $application) => [
            'reference_number' => $application->reference_number,
            'type' => $application->typeLabel(),
            'franchise_number' => $application->franchise?->franchise_number,
            'franchisee' => $application->franchisee?->full_name,
            'status' => $application->statusLabel(),
            'submitted_at' => $application->submitted_at?->toDateString(),
            'decided_at' => $application->decided_at?->toDateString(),
            'decided_by' => $application->decidedBy?->name,
        ]);

        return ApiResponse::success($rows, 'Application report generated.', 200, $this->paginationMeta($paginated));
    }
}
