<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\FeeTypeResource;
use App\Models\Application;
use App\Models\Assessment;
use App\Models\FeeType;
use App\Models\Payment;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Applications as seen by Treasury: which ones still need an assessment,
 * which are waiting for payment, and which have been paid.
 */
class ApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginated = Application::query()
            ->with([
                'franchise',
                'franchisee',
                'assessment.items.feeType',
                'assessment.payments',
                'certificate',
            ])
            ->ofType($request->string('type')->toString() ?: null)
            ->search($request->string('q')->toString() ?: null)
            ->when($request->filled('assessment_status'), function (Builder $query) use ($request) {
                match ($request->string('assessment_status')->toString()) {
                    'unassessed' => $query->whereDoesntHave('assessment'),
                    'pending' => $query->whereHas('assessment', fn (Builder $inner) => $inner
                        ->where('status', Assessment::STATUS_PENDING)),
                    'paid' => $query->whereHas('assessment', fn (Builder $inner) => $inner
                        ->where('status', Assessment::STATUS_PAID)),
                    default => $query,
                };
            })
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('status', $request->string('status')->toString()))
            ->when($request->boolean('ready_for_assessment'), fn (Builder $query) => $query
                ->whereIn('status', [
                    Application::STATUS_SUBMITTED,
                    Application::STATUS_UNDER_REVIEW,
                    Application::STATUS_APPROVED,
                ])
                ->whereDoesntHave('assessment'))
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            ApplicationResource::collection($paginated),
            'Applications retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Application $application): JsonResponse
    {
        $application->load([
            'franchise',
            'franchisee',
            'transferDetail',
            'vehicleChange.existingVehicle',
            'assessment.items.feeType',
            'assessment.payments',
            'payments.events',
            'certificate.issuedBy',
            'documents.uploadedBy',
            'documents.reviewedBy',
            'statusLogs.performedBy',
            'decidedBy',
        ]);

        return ApiResponse::success(
            new ApplicationResource($application),
            'Application retrieved successfully.',
        );
    }

    public function feeTypes(): JsonResponse
    {
        return ApiResponse::success(
            FeeTypeResource::collection(FeeType::query()->where('is_active', true)->orderBy('application_type')->orderBy('name')->get()),
            'Fee types retrieved successfully.',
        );
    }

    public function stats(): JsonResponse
    {
        return ApiResponse::success([
            'unassessed' => Application::query()
                ->whereDoesntHave('assessment')
                ->whereIn('status', [Application::STATUS_SUBMITTED, Application::STATUS_UNDER_REVIEW, Application::STATUS_APPROVED])
                ->count(),
            'assessed_unpaid' => Assessment::query()->where('status', Assessment::STATUS_PENDING)->count(),
            'pending_payments' => Payment::query()->where('status', Payment::STATUS_PENDING)->count(),
            'paid_this_month' => Payment::query()
                ->where('status', Payment::STATUS_SUCCESSFUL)
                ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
                ->count(),
            'collected_today' => (float) Payment::query()
                ->where('status', Payment::STATUS_SUCCESSFUL)
                ->whereDate('paid_at', now()->toDateString())
                ->sum('amount'),
            'collected_this_month' => (float) Payment::query()
                ->where('status', Payment::STATUS_SUCCESSFUL)
                ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
                ->sum('amount'),
            'by_status' => Payment::query()
                ->selectRaw('status, COUNT(*) as total, COALESCE(SUM(amount), 0) as amount')
                ->groupBy('status')
                ->get()
                ->keyBy('status'),
        ], 'Treasury statistics retrieved successfully.');
    }
}
