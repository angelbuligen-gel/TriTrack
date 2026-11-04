<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Http\Resources\FeeTypeResource;
use App\Models\Application;
use App\Models\Assessment;
use App\Models\FeeType;
use App\Services\AssessmentService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Fee assessment endpoints. Only Treasury personnel may set or cancel
 * amounts; the administrator can view them for reporting.
 */
class AssessmentController extends Controller
{
    public function __construct(private readonly AssessmentService $assessments) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = Assessment::query()
            ->with(['application.franchise', 'application.franchisee', 'assessedBy', 'items.feeType', 'payments'])
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('status', $request->string('status')->toString()))
            ->when($request->filled('type'), fn (Builder $query) => $query
                ->whereHas('application', fn (Builder $inner) => $inner
                    ->where('application_type', $request->string('type')->toString())))
            ->when($request->filled('q'), fn (Builder $query) => $query->where(function (Builder $inner) use ($request) {
                $keyword = $request->string('q')->toString();

                $inner
                    ->where('assessment_number', 'like', "%{$keyword}%")
                    ->orWhereHas('application', fn (Builder $application) => $application
                        ->where('reference_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('application.franchise', fn (Builder $franchise) => $franchise
                        ->where('franchise_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('application.franchisee', fn (Builder $franchisee) => $franchisee
                        ->where('first_name', 'like', "%{$keyword}%")
                        ->orWhere('last_name', 'like', "%{$keyword}%"));
            }))
            ->orderByDesc('assessed_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            AssessmentResource::collection($paginated),
            'Assessments retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Assessment $assessment): JsonResponse
    {
        $assessment->load([
            'application.franchise',
            'application.franchisee',
            'application.transferDetail',
            'application.vehicleChange.existingVehicle',
            'assessedBy',
            'items.feeType',
            'payments.events',
            'payments.verifiedBy',
        ]);

        return ApiResponse::success(
            new AssessmentResource($assessment),
            'Assessment retrieved successfully.',
        );
    }

    /**
     * Fee suggestions for an application, so treasury does not type
     * standard amounts from memory.
     */
    public function feeTypes(Application $application): JsonResponse
    {
        return ApiResponse::success(
            FeeTypeResource::collection(
                FeeType::query()->forType($application->application_type)->orderBy('name')->get(),
            ),
            'Fee types retrieved successfully.',
        );
    }

    public function store(StoreAssessmentRequest $request, Application $application): JsonResponse
    {
        $assessment = $this->assessments->assess(
            $application,
            $request->user(),
            $request->input('items'),
            $request->string('remarks')->toString() ?: null,
        );

        return ApiResponse::success(
            new AssessmentResource($assessment->load([
                'application.franchise',
                'application.franchisee',
                'items.feeType',
                'payments',
            ])),
            'Assessment saved successfully.',
            201,
        );
    }

    public function cancel(Request $request, Assessment $assessment): JsonResponse
    {
        $assessment = $this->assessments->cancel($assessment, $request->user());

        return ApiResponse::success(
            new AssessmentResource($assessment->load(['application.franchise', 'application.franchisee', 'items.feeType'])),
            'Assessment cancelled successfully.',
        );
    }
}
