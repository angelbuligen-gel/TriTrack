<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\WorkflowException;
use App\Http\Controllers\Concerns\StreamsApplicationDocuments;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreChangeMotorApplicationRequest;
use App\Http\Requests\StoreRenewalApplicationRequest;
use App\Http\Requests\StoreTransferApplicationRequest;
use App\Http\Requests\UploadApplicationDocumentRequest;
use App\Http\Resources\ApplicationDocumentResource;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\VehicleResource;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\DocumentRequirement;
use App\Models\Franchise;
use App\Models\Franchisee;
use App\Services\ApplicationDocumentStorage;
use App\Services\ApplicationWorkflow;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Franchisee-facing application endpoints, scoped to the signed-in account.
 */
class MyApplicationController extends Controller
{
    use StreamsApplicationDocuments;

    public function __construct(
        private readonly ApplicationWorkflow $workflow,
        private readonly ApplicationDocumentStorage $storage,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $franchisee = $this->franchiseeFor($request);

        if ($franchisee === null) {
            return ApiResponse::success([], 'No applications are linked to your account yet.');
        }

        $paginated = Application::query()
            ->with(['franchise', 'franchisee', 'documents', 'documents.uploadedBy', 'documents.reviewedBy'])
            ->where('franchisee_id', $franchisee->id)
            ->ofType($request->string('type')->toString() ?: null)
            ->withStatus($request->string('status')->toString() ?: null)
            ->search($request->string('q')->toString() ?: null)
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            ApplicationResource::collection($paginated),
            'Your applications were retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    /**
     * Renewal page data: the franchisee's franchises, each franchise's
     * eligibility, and the document checklist for a renewal.
     */
    public function renewalOptions(Request $request): JsonResponse
    {
        $franchisee = $this->franchiseeFor($request);

        $franchises = $franchisee === null
            ? collect()
            : $franchisee->franchises()
                ->with(['driverAssignments.driver', 'vehicleAssignments.vehicle'])
                ->orderByDesc('id')
                ->get();

        return ApiResponse::success([
            'franchisee' => $franchisee === null ? null : [
                'id' => $franchisee->id,
                'full_name' => $franchisee->full_name,
            ],
            'franchises' => $franchises->map(fn (Franchise $franchise) => [
                'franchise' => [
                    'id' => $franchise->id,
                    'franchise_number' => $franchise->franchise_number,
                    'expiration_date' => $franchise->expiration_date?->toDateString(),
                    'franchise_status' => $franchise->franchise_status,
                    'driver_names' => $franchise->driverAssignments
                        ->map(fn ($assignment) => $assignment->driver?->full_name)
                        ->filter()
                        ->values()
                        ->all(),
                    'vehicle_count' => $franchise->vehicleAssignments->count(),
                ],
                'eligibility' => $this->workflow->renewalEligibility($franchise),
            ])->values(),
            'requirements' => DocumentRequirement::query()
                ->forType(Application::TYPE_RENEWAL)
                ->get()
                ->map(fn (DocumentRequirement $requirement) => [
                    'code' => $requirement->code,
                    'name' => $requirement->name,
                    'description' => $requirement->description,
                    'is_required' => $requirement->is_required,
                ]),
            'renewal_history' => $franchisee === null
                ? []
                : Application::query()
                    ->where('franchisee_id', $franchisee->id)
                    ->where('application_type', Application::TYPE_RENEWAL)
                    ->orderByDesc('id')
                    ->get()
                    ->map(fn (Application $application) => [
                        'id' => $application->id,
                        'reference_number' => $application->reference_number,
                        'franchise_id' => $application->franchise_id,
                        'status' => $application->status,
                        'status_label' => $application->statusLabel(),
                        'coverage_year' => $application->coverage_year,
                        'submitted_at' => $application->submitted_at?->toIso8601String(),
                        'decided_at' => $application->decided_at?->toIso8601String(),
                    ]),
        ], 'Renewal options retrieved successfully.');
    }

    /**
     * Transfer page data: franchises that may be transferred, the current
     * owner details to prefill the form, and the transfer requirements.
     */
    public function transferOptions(Request $request): JsonResponse
    {
        $franchisee = $this->franchiseeFor($request);

        $franchises = $franchisee === null
            ? collect()
            : $franchisee->franchises()->with('activeVehicle')->orderByDesc('id')->get();

        return ApiResponse::success([
            'franchisee' => $franchisee === null ? null : [
                'id' => $franchisee->id,
                'full_name' => $franchisee->full_name,
                'contact_number' => $franchisee->contact_number,
                'address' => $franchisee->address,
                'barangay' => $franchisee->barangay,
                'city_municipality' => $franchisee->city_municipality,
                'province' => $franchisee->province,
            ],
            'franchises' => $franchises->map(fn (Franchise $franchise) => [
                'franchise' => [
                    'id' => $franchise->id,
                    'franchise_number' => $franchise->franchise_number,
                    'expiration_date' => $franchise->expiration_date?->toDateString(),
                    'franchise_status' => $franchise->franchise_status,
                ],
                'vehicle' => $franchise->activeVehicle === null
                    ? null
                    : new VehicleResource($franchise->activeVehicle),
                'eligibility' => $this->workflow->transferEligibility($franchise),
            ])->values(),
            'requirements' => $this->requirements(Application::TYPE_TRANSFER),
            'history' => $this->applicationHistory($franchisee, Application::TYPE_TRANSFER),
        ], 'Transfer options retrieved successfully.');
    }

    public function storeTransfer(StoreTransferApplicationRequest $request): JsonResponse
    {
        $franchise = $this->ownedFranchise($request);

        $application = $this->workflow->fileTransfer($franchise, $request->user(), $request->validated());

        return ApiResponse::success(
            new ApplicationResource($application->fresh()->load([
                'franchise', 'franchisee', 'transferDetail', 'documents', 'statusLogs.performedBy',
            ])),
            'Transfer application submitted successfully.',
            201,
        );
    }

    /**
     * Change motor page data: franchises, their active motors, and the
     * requirements for replacing a unit.
     */
    public function changeMotorOptions(Request $request): JsonResponse
    {
        $franchisee = $this->franchiseeFor($request);

        $franchises = $franchisee === null
            ? collect()
            : $franchisee->franchises()
                ->with('vehicleAssignments.vehicle')
                ->orderByDesc('id')
                ->get();

        return ApiResponse::success([
            'franchisee' => $franchisee === null ? null : [
                'id' => $franchisee->id,
                'full_name' => $franchisee->full_name,
            ],
            'franchises' => $franchises->map(fn (Franchise $franchise) => [
                'franchise' => [
                    'id' => $franchise->id,
                    'franchise_number' => $franchise->franchise_number,
                    'expiration_date' => $franchise->expiration_date?->toDateString(),
                    'franchise_status' => $franchise->franchise_status,
                ],
                'active_vehicles' => VehicleResource::collection(
                    $franchise->vehicleAssignments->pluck('vehicle')->filter(),
                ),
                'eligibility' => $this->workflow->changeMotorEligibility($franchise),
            ])->values(),
            'requirements' => $this->requirements(Application::TYPE_CHANGE_MOTOR),
            'history' => $this->applicationHistory($franchisee, Application::TYPE_CHANGE_MOTOR),
        ], 'Change motor options retrieved successfully.');
    }

    public function storeChangeMotor(StoreChangeMotorApplicationRequest $request): JsonResponse
    {
        $franchise = $this->ownedFranchise($request);

        $application = $this->workflow->fileChangeMotor($franchise, $request->user(), $request->validated());

        return ApiResponse::success(
            new ApplicationResource($application->fresh()->load([
                'franchise', 'franchisee', 'vehicleChange.existingVehicle', 'documents', 'statusLogs.performedBy',
            ])),
            'Change motor application submitted successfully.',
            201,
        );
    }

    /**
     * Submission history across all of the franchisee's applications.
     */
    public function documents(Request $request): JsonResponse
    {
        $franchisee = $this->franchiseeFor($request);

        if ($franchisee === null) {
            return ApiResponse::success([], 'No documents are linked to your account yet.');
        }

        $paginated = ApplicationDocument::query()
            ->with(['application.franchise', 'uploadedBy', 'reviewedBy'])
            ->whereHas('application', fn ($query) => $query->where('franchisee_id', $franchisee->id))
            ->when($request->filled('application_id'), fn ($query) => $query
                ->where('application_id', $request->integer('application_id')))
            ->when($request->filled('review_status'), fn ($query) => $query
                ->where('review_status', $request->string('review_status')->toString()))
            ->when($request->filled('q'), fn ($query) => $query
                ->where('original_name', 'like', '%'.$request->string('q')->toString().'%'))
            ->orderByDesc('uploaded_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        $data = collect($paginated->items())->map(fn (ApplicationDocument $document) => [
            'document' => new ApplicationDocumentResource($document),
            'application' => [
                'id' => $document->application?->id,
                'reference_number' => $document->application?->reference_number,
                'application_type' => $document->application?->application_type,
                'type_label' => $document->application?->typeLabel(),
                'franchise_number' => $document->application?->franchise?->franchise_number,
            ],
        ]);

        return ApiResponse::success(
            $data,
            'Your document history was retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function storeRenewal(StoreRenewalApplicationRequest $request): JsonResponse
    {
        $franchisee = $this->franchiseeFor($request);

        if ($franchisee === null) {
            throw WorkflowException::forbidden('No franchisee record is linked to your account yet.');
        }

        $franchise = Franchise::query()
            ->where('id', $request->integer('franchise_id'))
            ->where('franchisee_id', $franchisee->id)
            ->first();

        if ($franchise === null) {
            throw WorkflowException::forbidden('You can only file applications for your own franchises.');
        }

        $application = $this->workflow->fileRenewal($franchise, $request->user(), $request->validated());

        return ApiResponse::success(
            new ApplicationResource(
                $application->fresh()->load(['franchise', 'franchisee', 'documents', 'statusLogs.performedBy']),
            ),
            'Renewal application submitted successfully.',
            201,
        );
    }

    public function show(Request $request, Application $application): JsonResponse
    {
        $this->assertOwned($request, $application);

        $application->load([
            'franchise.franchisee',
            'franchise.franchisee.user',
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

    public function storeDocument(UploadApplicationDocumentRequest $request, Application $application): JsonResponse
    {
        $this->assertOwned($request, $application);

        $document = $this->storage->store(
            $application,
            $request->string('requirement_code')->toString(),
            $request->file('file'),
            $request->user(),
        );

        return ApiResponse::success(
            new ApplicationDocumentResource($document->load(['uploadedBy', 'reviewedBy'])),
            'Document submitted successfully.',
            201,
        );
    }

    public function documentFile(Request $request, ApplicationDocument $document): Response
    {
        $this->assertOwned($request, $document->application);

        return $this->documentResponse($document, $request);
    }

    private function franchiseeFor(Request $request): ?Franchisee
    {
        return Franchisee::query()->where('user_id', $request->user()->id)->first();
    }

    private function ownedFranchise(Request $request): Franchise
    {
        $franchisee = $this->franchiseeFor($request);

        if ($franchisee === null) {
            throw WorkflowException::forbidden('No franchisee record is linked to your account yet.');
        }

        $franchise = Franchise::query()
            ->where('id', $request->integer('franchise_id'))
            ->where('franchisee_id', $franchisee->id)
            ->first();

        if ($franchise === null) {
            throw WorkflowException::forbidden('You can only file applications for your own franchises.');
        }

        return $franchise;
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function requirements(string $type)
    {
        return DocumentRequirement::query()
            ->forType($type)
            ->get()
            ->map(fn (DocumentRequirement $requirement) => [
                'code' => $requirement->code,
                'name' => $requirement->name,
                'description' => $requirement->description,
                'is_required' => $requirement->is_required,
            ]);
    }

    private function applicationHistory(?Franchisee $franchisee, string $type)
    {
        return $franchisee === null
            ? []
            : Application::query()
                ->where('franchisee_id', $franchisee->id)
                ->where('application_type', $type)
                ->orderByDesc('id')
                ->get()
                ->map(fn (Application $application) => [
                    'id' => $application->id,
                    'reference_number' => $application->reference_number,
                    'franchise_id' => $application->franchise_id,
                    'status' => $application->status,
                    'status_label' => $application->statusLabel(),
                    'submitted_at' => $application->submitted_at?->toIso8601String(),
                    'decided_at' => $application->decided_at?->toIso8601String(),
                ]);
    }

    private function assertOwned(Request $request, Application $application): void
    {
        $franchisee = $this->franchiseeFor($request);

        if ($franchisee === null || $application->franchisee_id !== $franchisee->id) {
            abort(403, 'You may only access your own applications.');
        }
    }
}
