<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApplicationDecisionRequest;
use App\Http\Requests\ApplicationRemarksRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Services\ApplicationWorkflow;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function __construct(private readonly ApplicationWorkflow $workflow) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = $this->baseQuery($request)
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
            'franchise.franchisee',
            'franchise',
            'franchisee',
            'transferDetail',
            'vehicleChange.existingVehicle',
            'assessment.items.feeType',
            'assessment.payments',
            'payments',
            'certificate.issuedBy',
            'documents.uploadedBy',
            'documents.reviewedBy',
            'documents.mlVerifiedBy',
            'statusLogs.performedBy',
            'decidedBy',
        ]);

        return ApiResponse::success(
            new ApplicationResource($application),
            'Application retrieved successfully.',
        );
    }

    /**
     * Counters for the BPLO dashboard.
     */
    public function stats(): JsonResponse
    {
        $byStatus = Application::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byType = collect(Application::TYPES)->mapWithKeys(fn (string $type) => [
            $type => [
                'open' => Application::query()
                    ->where('application_type', $type)
                    ->whereIn('status', Application::OPEN_STATUSES)
                    ->count(),
                'approved' => Application::query()
                    ->where('application_type', $type)
                    ->where('status', Application::STATUS_APPROVED)
                    ->count(),
                'rejected' => Application::query()
                    ->where('application_type', $type)
                    ->where('status', Application::STATUS_REJECTED)
                    ->count(),
            ],
        ]);

        $recent = Application::query()
            ->with(['franchise', 'franchisee'])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Application $application) => [
                'id' => $application->id,
                'reference_number' => $application->reference_number,
                'application_type' => $application->application_type,
                'type_label' => $application->typeLabel(),
                'status' => $application->status,
                'status_label' => $application->statusLabel(),
                'franchise_number' => $application->franchise?->franchise_number,
                'franchisee_name' => $application->franchisee?->full_name,
                'submitted_at' => $application->submitted_at?->toIso8601String(),
            ]);

        return ApiResponse::success([
            'totals' => [
                'all' => Application::query()->count(),
                'open' => Application::query()->whereIn('status', Application::OPEN_STATUSES)->count(),
                'submitted' => (int) ($byStatus[Application::STATUS_SUBMITTED] ?? 0),
                'under_review' => (int) ($byStatus[Application::STATUS_UNDER_REVIEW] ?? 0),
                'documents_pending' => (int) ($byStatus[Application::STATUS_DOCUMENTS_PENDING] ?? 0),
                'approved' => (int) ($byStatus[Application::STATUS_APPROVED] ?? 0),
                'rejected' => (int) ($byStatus[Application::STATUS_REJECTED] ?? 0),
                'decided_this_month' => Application::query()
                    ->whereNotNull('decided_at')
                    ->whereBetween('decided_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
                'documents_awaiting_review' => ApplicationDocument::query()
                    ->where('review_status', ApplicationDocument::REVIEW_PENDING)
                    ->whereHas('application', fn (Builder $query) => $query
                        ->whereIn('status', Application::OPEN_STATUSES))
                    ->count(),
            ],
            'by_type' => $byType,
            'recent' => $recent,
        ], 'Application statistics retrieved successfully.');
    }

    public function startReview(Application $application, Request $request): JsonResponse
    {
        $remarks = $request->string('remarks')->toString() ?: null;

        $application = $this->workflow->startReview($application, $request->user(), $remarks);

        return ApiResponse::success(
            new ApplicationResource($application->load(['franchise', 'franchisee', 'documents', 'statusLogs.performedBy'])),
            'Application review started.',
        );
    }

    public function requestCorrection(ApplicationRemarksRequest $request, Application $application): JsonResponse
    {
        $application = $this->workflow->requestCorrection(
            $application,
            $request->user(),
            $request->string('remarks')->toString(),
        );

        return ApiResponse::success(
            new ApplicationResource($application->load(['franchise', 'franchisee', 'documents', 'statusLogs.performedBy'])),
            'Correction request sent to the franchisee.',
        );
    }

    public function decide(ApplicationDecisionRequest $request, Application $application): JsonResponse
    {
        $approved = $request->string('decision')->toString() === 'approve';

        $application = $this->workflow->decide(
            $application,
            $request->user(),
            $approved,
            $request->string('remarks')->toString() ?: null,
        );

        return ApiResponse::success(
            new ApplicationResource($application->load([
                'franchise.franchisee',
                'franchise',
                'franchisee',
                'transferDetail',
                'vehicleChange.existingVehicle',
                'assessment.items.feeType',
                'assessment.payments',
                'payments',
                'certificate',
                'documents',
                'statusLogs.performedBy',
                'decidedBy',
            ])),
            $approved ? 'Application approved.' : 'Application rejected.',
        );
    }

    /**
     * @return Builder<Application>
     */
    private function baseQuery(Request $request): Builder
    {
        return Application::query()
            ->with([
                'franchise',
                'franchisee',
                'transferDetail',
                'vehicleChange.existingVehicle',
                'assessment',
                'certificate',
                'documents',
                'documents.uploadedBy',
                'documents.reviewedBy',
            ])
            ->ofType($request->string('type')->toString() ?: null)
            ->withStatus($request->string('status')->toString() ?: null)
            ->search($request->string('q')->toString() ?: null)
            ->when($request->filled('franchise_id'), fn (Builder $query) => $query
                ->where('franchise_id', $request->integer('franchise_id')))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('submitted_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('submitted_at', '<=', $request->date('to')))
            ->when($request->boolean('open'), fn (Builder $query) => $query
                ->whereIn('status', Application::OPEN_STATUSES));
    }
}
