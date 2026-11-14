<?php

namespace App\Services;

use App\Exceptions\WorkflowException;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\ApplicationStatusLog;
use App\Models\DocumentRequirement;
use App\Models\ApplicationTransferDetail;
use App\Models\ApplicationVehicleChange;
use App\Models\Franchise;
use App\Models\Franchisee;
use App\Models\FranchiseVehicle;
use App\Models\User;
use App\Models\Vehicle;
use App\Support\PhoneNumber;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Business rules shared by franchise renewal, transfer, and change motor:
 * filing, the document checklist, status transitions, and decisions.
 */
class ApplicationWorkflow
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogger $activity,
    ) {}

    /**
     * Franchise statuses that cannot start a new application.
     */
    private const BLOCKED_FRANCHISE_STATUSES = [
        Franchise::STATUS_CANCELLED,
        Franchise::STATUS_SUSPENDED,
        Franchise::STATUS_TRANSFERRED,
    ];

    /**
     * Requirements the franchisee must satisfy, paired with the newest
     * submission for each one. The whole submission history stays
     * available under `documents`.
     *
     * @return array<int, array<string, mixed>>
     */
    public function checklist(Application $application): array
    {
        $requirements = DocumentRequirement::query()
            ->forType($application->application_type)
            ->get();

        $documents = $this->documentHistory($application)->groupBy('requirement_code');

        return $requirements->map(function (DocumentRequirement $requirement) use ($documents) {
            /** @var Collection<int, ApplicationDocument> $history */
            $history = $documents->get($requirement->code, collect());
            /** @var ApplicationDocument|null $latest */
            $latest = $history->first();

            return [
                'code' => $requirement->code,
                'name' => $requirement->name,
                'description' => $requirement->description,
                'is_required' => $requirement->is_required,
                'sort_order' => $requirement->sort_order,
                'state' => $this->documentState($latest),
                'submission_count' => $history->count(),
                'latest_document' => $latest,
                'documents' => $history->values(),
            ];
        })->all();
    }

    /**
     * @return array<string, int|bool>
     */
    public function summary(Application $application): array
    {
        $checklist = collect($this->checklist($application));
        $required = $checklist->where('is_required', true);

        $countOf = fn (string $state): int => $required->where('state', $state)->count();

        return [
            'required_total' => $required->count(),
            'approved' => $countOf('approved'),
            'pending' => $countOf('pending'),
            'rejected' => $countOf('rejected'),
            'missing' => $countOf('missing'),
            'documents_submitted' => $this->documentHistory($application)->count(),
            'is_complete' => $required->isNotEmpty()
                && $required->every(fn (array $item) => $item['state'] === 'approved'),
        ];
    }

    /**
     * Why the application cannot be approved yet, or null when it can.
     */
    public function approvalBlocker(Application $application): ?string
    {
        if (! $application->isOpen()) {
            return 'This application has already been decided.';
        }

        $summary = $this->summary($application);

        return match (true) {
            $summary['missing'] > 0 => 'Required documents are still missing from this application.',
            $summary['rejected'] > 0 => 'A required document was rejected and must be replaced.',
            $summary['pending'] > 0 => 'Every submitted document must be reviewed before the application is decided.',
            default => null,
        };
    }

    /**
     * Renewal eligibility for a franchise, including any open application.
     *
     * @return array<string, mixed>
     */
    public function renewalEligibility(Franchise $franchise): array
    {
        $open = $this->openApplication($franchise, Application::TYPE_RENEWAL);

        $reason = match (true) {
            in_array($franchise->franchise_status, self::BLOCKED_FRANCHISE_STATUSES, true)
                => 'This franchise is '.str_replace('_', ' ', $franchise->franchise_status).' and cannot be renewed.',
            $open !== null => "Renewal {$open->reference_number} is already in progress for this franchise.",
            default => null,
        };

        return [
            'eligible' => $reason === null,
            'reason' => $reason,
            'open_application' => $open,
            'last_expiration_date' => $franchise->expiration_date?->toDateString(),
            'is_expired' => $franchise->isExpired(),
            'suggested_coverage_year' => $this->suggestedCoverageYear($franchise),
            'last_renewal' => Application::query()
                ->where('franchise_id', $franchise->id)
                ->where('application_type', Application::TYPE_RENEWAL)
                ->whereIn('status', [Application::STATUS_APPROVED, Application::STATUS_COMPLETED])
                ->orderByDesc('decided_at')
                ->first(),
        ];
    }

    /**
     * Transfer eligibility for a franchise, including any open application.
     *
     * @return array<string, mixed>
     */
    public function transferEligibility(Franchise $franchise): array
    {
        $open = $this->openApplication($franchise, Application::TYPE_TRANSFER);

        $reason = match (true) {
            in_array($franchise->franchise_status, self::BLOCKED_FRANCHISE_STATUSES, true)
                => 'This franchise is '.str_replace('_', ' ', $franchise->franchise_status).' and cannot be transferred.',
            $open !== null => "Transfer {$open->reference_number} is already in progress for this franchise.",
            default => null,
        };

        return [
            'eligible' => $reason === null,
            'reason' => $reason,
            'open_application' => $open,
            'last_transfer' => Application::query()
                ->where('franchise_id', $franchise->id)
                ->where('application_type', Application::TYPE_TRANSFER)
                ->whereIn('status', [Application::STATUS_APPROVED, Application::STATUS_COMPLETED])
                ->orderByDesc('decided_at')
                ->first(),
        ];
    }

    /**
     * Change motor eligibility for a franchise, including its active units.
     *
     * @return array<string, mixed>
     */
    public function changeMotorEligibility(Franchise $franchise): array
    {
        $open = $this->openApplication($franchise, Application::TYPE_CHANGE_MOTOR);

        $franchise->loadMissing('vehicleAssignments.vehicle');
        $activeVehicles = $franchise->vehicleAssignments->pluck('vehicle')->filter()->values();

        $reason = match (true) {
            in_array($franchise->franchise_status, self::BLOCKED_FRANCHISE_STATUSES, true)
                => 'This franchise is '.str_replace('_', ' ', $franchise->franchise_status).' and cannot change motor.',
            $open !== null => "Change motor application {$open->reference_number} is already in progress.",
            $activeVehicles->isEmpty() => 'This franchise has no active motor/vehicle assigned, so there is nothing to change.',
            default => null,
        };

        return [
            'eligible' => $reason === null,
            'reason' => $reason,
            'open_application' => $open,
            'vehicles' => $activeVehicles->map(fn (Vehicle $vehicle) => [
                'id' => $vehicle->id,
                'motor_number' => $vehicle->motor_number,
                'chassis_number' => $vehicle->chassis_number,
                'plate_number' => $vehicle->plate_number,
                'make' => $vehicle->make,
                'model' => $vehicle->model,
                'year_model' => $vehicle->year_model,
                'color' => $vehicle->color,
                'display' => $vehicle->display,
            ])->all(),
        ];
    }

    /**
     * File a franchise transfer application.
     *
     * @param  array<string, mixed>  $data
     */
    public function fileTransfer(Franchise $franchise, User $user, array $data): Application
    {
        $this->assertCanFile($franchise, Application::TYPE_TRANSFER, 'transferred', $user);

        return DB::transaction(function () use ($franchise, $user, $data) {
            $application = $this->createWithReference([
                'franchise_id' => $franchise->id,
                'franchisee_id' => $franchise->franchisee_id,
                'application_type' => Application::TYPE_TRANSFER,
                'status' => Application::STATUS_SUBMITTED,
                'franchisee_remarks' => $data['franchisee_remarks'] ?? null,
                'submitted_at' => now(),
            ], Application::TYPE_TRANSFER);

            ApplicationTransferDetail::create([
                'application_id' => $application->id,
                'new_owner_first_name' => $data['new_owner_first_name'],
                'new_owner_middle_name' => $data['new_owner_middle_name'] ?? null,
                'new_owner_last_name' => $data['new_owner_last_name'],
                'new_owner_suffix' => $data['new_owner_suffix'] ?? null,
                'new_owner_contact_number' => PhoneNumber::normalize($data['new_owner_contact_number']) ?? $data['new_owner_contact_number'],
                'new_owner_email' => $data['new_owner_email'] ?? null,
                'new_owner_address' => $data['new_owner_address'],
                'new_owner_barangay' => $data['new_owner_barangay'] ?? null,
                'new_owner_city_municipality' => $data['new_owner_city_municipality'] ?? null,
                'new_owner_province' => $data['new_owner_province'] ?? null,
                'relationship_to_owner' => $data['relationship_to_owner'] ?? null,
                'remarks' => $data['remarks'] ?? null,
            ]);

            $this->log($application, 'submitted', null, Application::STATUS_SUBMITTED, $user, 'Franchise transfer application filed by the franchisee.');
            $this->activity->log('application.filed', "Franchise transfer {$application->reference_number} filed.", $user, $application);

            return $application->fresh()->load('transferDetail');
        });
    }

    /**
     * File a change motor application.
     *
     * @param  array<string, mixed>  $data
     */
    public function fileChangeMotor(Franchise $franchise, User $user, array $data): Application
    {
        $this->assertCanFile($franchise, Application::TYPE_CHANGE_MOTOR, 'changed', $user);

        $franchise->loadMissing('vehicleAssignments.vehicle');
        $activeVehicles = $franchise->vehicleAssignments->pluck('vehicle')->filter();

        $existingVehicleId = $data['existing_vehicle_id'] ?? $activeVehicles->first()?->id;

        if ($existingVehicleId === null || ! $activeVehicles->contains(fn (Vehicle $vehicle) => $vehicle->id === (int) $existingVehicleId)) {
            throw WorkflowException::invalid(
                'Select an active motor that belongs to this franchise.',
                ['existing_vehicle_id' => ['The selected motor is not actively assigned to this franchise.']],
            );
        }

        return DB::transaction(function () use ($franchise, $user, $data, $existingVehicleId) {
            $application = $this->createWithReference([
                'franchise_id' => $franchise->id,
                'franchisee_id' => $franchise->franchisee_id,
                'application_type' => Application::TYPE_CHANGE_MOTOR,
                'status' => Application::STATUS_SUBMITTED,
                'franchisee_remarks' => $data['franchisee_remarks'] ?? null,
                'submitted_at' => now(),
            ], Application::TYPE_CHANGE_MOTOR);

            ApplicationVehicleChange::create([
                'application_id' => $application->id,
                'existing_vehicle_id' => (int) $existingVehicleId,
                'proposed_motor_number' => $data['proposed_motor_number'],
                'proposed_chassis_number' => $data['proposed_chassis_number'] ?? null,
                'proposed_plate_number' => $data['proposed_plate_number'] ?? null,
                'proposed_or_number' => $data['proposed_or_number'] ?? null,
                'proposed_cr_number' => $data['proposed_cr_number'] ?? null,
                'make' => $data['make'] ?? null,
                'model' => $data['model'] ?? null,
                'year_model' => $data['year_model'] ?? null,
                'color' => $data['color'] ?? null,
                'remarks' => $data['remarks'] ?? null,
            ]);

            $this->log($application, 'submitted', null, Application::STATUS_SUBMITTED, $user, 'Change motor application filed by the franchisee.');
            $this->activity->log('application.filed', "Change motor application {$application->reference_number} filed.", $user, $application);

            return $application->fresh()->load('vehicleChange.existingVehicle');
        });
    }

    /**
     * File a renewal application for one of the franchisee's franchises.
     *
     * @param  array<string, mixed>  $data
     */
    public function fileRenewal(Franchise $franchise, User $user, array $data): Application
    {
        if (! $user->canTransact()) {
            throw WorkflowException::forbidden(
                'Verify your mobile number and wait for account activation before filing applications.',
            );
        }

        if (in_array($franchise->franchise_status, self::BLOCKED_FRANCHISE_STATUSES, true)) {
            throw WorkflowException::conflict(
                'A franchise marked as '.str_replace('_', ' ', $franchise->franchise_status).' cannot be renewed.',
            );
        }

        $open = $this->openApplication($franchise, Application::TYPE_RENEWAL);

        if ($open !== null) {
            throw WorkflowException::conflict(
                "Renewal application {$open->reference_number} is still open for this franchise.",
                ['franchise_id' => ["Renewal {$open->reference_number} is already in progress."]],
            );
        }

        return DB::transaction(function () use ($franchise, $user, $data) {
            $coverageYear = $this->suggestedCoverageYear($franchise);

            $application = $this->createWithReference([
                'franchise_id' => $franchise->id,
                'franchisee_id' => $franchise->franchisee_id,
                'application_type' => Application::TYPE_RENEWAL,
                'status' => Application::STATUS_SUBMITTED,
                'coverage_year' => $coverageYear,
                'previous_expiration_date' => $franchise->expiration_date?->toDateString(),
                'franchisee_remarks' => $data['franchisee_remarks'] ?? null,
                'submitted_at' => now(),
            ], Application::TYPE_RENEWAL);

            $this->log($application, 'submitted', null, Application::STATUS_SUBMITTED, $user, 'Renewal application filed by the franchisee.');

            return $application;
        });
    }

    /**
     * Store a new upload. Existing rows are never replaced, so every
     * submission keeps its own date and review outcome.
     *
     * @param  array<string, mixed>  $file  ['path' => string, 'original_name' => string, 'mime_type' => string, 'file_size' => int]
     */
    public function submitDocument(Application $application, string $requirementCode, array $file, User $user): ApplicationDocument
    {
        if (! $application->isOpen()) {
            throw WorkflowException::conflict('Documents can no longer be submitted for a decided application.');
        }

        $requirement = DocumentRequirement::query()
            ->forType($application->application_type)
            ->where('code', $requirementCode)
            ->first();

        if ($requirement === null) {
            throw WorkflowException::invalid(
                'The selected document requirement does not belong to this application.',
                ['requirement_code' => ['Unknown document requirement for this application type.']],
            );
        }

        $document = ApplicationDocument::create([
            'application_id' => $application->id,
            'requirement_code' => $requirement->code,
            'document_type' => $requirement->name,
            'original_name' => $file['original_name'],
            'file_path' => $file['path'],
            'mime_type' => $file['mime_type'],
            'file_size' => $file['file_size'],
            'uploaded_by' => $user->id,
            'uploaded_at' => now(),
            'review_status' => ApplicationDocument::REVIEW_PENDING,
            'ml_status' => 'not_processed',
        ]);

        $from = $application->status;

        $this->log($application, 'document_submitted', $from, $from, $user, "Submitted {$requirement->name}.");

        // Uploading after a correction request puts the application back
        // in the queue for BPLO to review the new document.
        if ($from === Application::STATUS_DOCUMENTS_PENDING) {
            $application->update(['status' => Application::STATUS_SUBMITTED]);
            $this->log($application, 'resubmitted', $from, Application::STATUS_SUBMITTED, $user, 'Franchisee resubmitted a document for review.');
        }

        return $document;
    }

    /**
     * Start the BPLO review of a submitted application.
     */
    public function startReview(Application $application, User $user, ?string $remarks = null): Application
    {
        if (! $application->isOpen()) {
            throw WorkflowException::conflict('This application has already been decided.');
        }

        if ($application->status === Application::STATUS_UNDER_REVIEW) {
            throw WorkflowException::conflict('This application is already under review.');
        }

        return $this->transition(
            $application,
            Application::STATUS_UNDER_REVIEW,
            'review_started',
            $user,
            $remarks,
        );
    }

    /**
     * Send the application back to the franchisee for corrections.
     */
    public function requestCorrection(Application $application, User $user, string $remarks): Application
    {
        if (! $application->isOpen()) {
            throw WorkflowException::conflict('This application has already been decided.');
        }

        return $this->transition(
            $application,
            Application::STATUS_DOCUMENTS_PENDING,
            'correction_requested',
            $user,
            $remarks,
        );
    }

    /**
     * Approve or reject an application. Approval of a renewal also moves
     * the franchise's expiration date forward.
     */
    public function decide(Application $application, User $user, bool $approved, ?string $remarks = null): Application
    {
        if ($approved) {
            $blocker = $this->approvalBlocker($application);

            if ($blocker !== null) {
                throw WorkflowException::conflict($blocker);
            }
        } elseif (! $application->isOpen()) {
            throw WorkflowException::conflict('This application has already been decided.');
        }

        return DB::transaction(function () use ($application, $user, $approved, $remarks) {
            $from = $application->status;

            $application->update([
                'status' => $approved ? Application::STATUS_APPROVED : Application::STATUS_REJECTED,
                'staff_remarks' => $remarks,
                'under_review_at' => $application->under_review_at ?? now(),
                'decided_at' => now(),
                'decided_by' => $user->id,
            ]);

            $this->log(
                $application,
                $approved ? 'approved' : 'rejected',
                $from,
                $application->status,
                $user,
                $remarks,
            );

            if ($approved) {
                match ($application->application_type) {
                    Application::TYPE_RENEWAL => $this->applyRenewalApproval($application),
                    Application::TYPE_TRANSFER => $this->applyTransferApproval($application),
                    Application::TYPE_CHANGE_MOTOR => $this->applyChangeMotorApproval($application),
                    default => null,
                };
            }

            $this->activity->log(
                $approved ? 'application.approved' : 'application.rejected',
                "{$application->typeLabel()} {$application->reference_number} ".($approved ? 'approved' : 'rejected').'.',
                $user,
                $application,
            );

            $this->notifications->notifyApplicationEvent(
                $application,
                $approved ? 'application_approved' : 'application_rejected',
                ['reason' => $remarks ?? ''],
            );

            return $application->fresh();
        });
    }

    /**
     * Record a staff decision on a single uploaded document.
     */
    public function reviewDocument(
        ApplicationDocument $document,
        User $user,
        string $reviewStatus,
        ?string $remarks = null,
    ): ApplicationDocument {
        if (! $document->application?->isOpen()) {
            throw WorkflowException::conflict('Documents of a decided application can no longer be reviewed.');
        }

        if (! in_array($reviewStatus, [
            ApplicationDocument::REVIEW_APPROVED,
            ApplicationDocument::REVIEW_REJECTED,
        ], true)) {
            throw WorkflowException::invalid('Select either approve or reject for the document.');
        }

        return DB::transaction(function () use ($document, $user, $reviewStatus, $remarks) {
            $document->update([
                'review_status' => $reviewStatus,
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
                'review_remarks' => $remarks,
            ]);

            $application = $document->application;

            $this->log(
                $application,
                $reviewStatus === ApplicationDocument::REVIEW_APPROVED ? 'document_approved' : 'document_rejected',
                $application->status,
                $application->status,
                $user,
                "{$document->document_type}: ".($remarks ?: ucfirst($reviewStatus)),
            );

            $this->activity->log(
                $reviewStatus === ApplicationDocument::REVIEW_APPROVED ? 'document.approved' : 'document.rejected',
                "{$document->document_type} on {$application->reference_number} was {$reviewStatus}.",
                $user,
                $document,
            );

            if ($reviewStatus === ApplicationDocument::REVIEW_REJECTED) {
                $this->notifications->notifyApplicationEvent(
                    $application,
                    'documents_missing',
                    ['reason' => $remarks ?: "Your uploaded {$document->document_type} needs correction."],
                );
            } else {
                $this->notifications->notifyApplication(
                    $application,
                    "Document {$reviewStatus}",
                    "Your uploaded {$document->document_type} was {$reviewStatus}.",
                    'success',
                );
            }

            // A rejected document means the franchisee has to act again.
            if ($reviewStatus === ApplicationDocument::REVIEW_REJECTED
                && $application->status === Application::STATUS_UNDER_REVIEW) {
                $application->update(['status' => Application::STATUS_DOCUMENTS_PENDING]);
                $this->log($application, 'correction_requested', Application::STATUS_UNDER_REVIEW, Application::STATUS_DOCUMENTS_PENDING, $user, 'A required document was rejected.');
            }

            return $document->fresh();
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function statusHistory(Application $application): array
    {
        return $application->statusLogs()
            ->with('performedBy:id,name')
            ->get()
            ->map(fn (ApplicationStatusLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'from_status' => $log->from_status,
                'to_status' => $log->to_status,
                'remarks' => $log->remarks,
                'performed_by' => $log->performedBy?->name,
                'performed_by_role' => $log->performedBy?->role,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->all();
    }

    public function openApplication(Franchise $franchise, string $type): ?Application
    {
        return Application::query()
            ->where('franchise_id', $franchise->id)
            ->where('application_type', $type)
            ->whereIn('status', Application::OPEN_STATUSES)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * A renewal covers the franchise year after the earlier of the current
     * expiration year and the current year.
     */
    public function suggestedCoverageYear(Franchise $franchise): int
    {
        $current = CarbonImmutable::now()->year;
        $expirationYear = $franchise->expiration_date?->year ?? $current;

        return max($current, (int) $expirationYear) + 1;
    }

    /**
     * @return Collection<int, ApplicationDocument>
     */
    public function documentHistory(Application $application): Collection
    {
        $documents = $application->relationLoaded('documents')
            ? $application->documents
            : $application->documents()->get();

        return $documents
            ->sortByDesc(fn (ApplicationDocument $document) => sprintf(
                '%013d-%013d',
                $document->uploaded_at?->getTimestamp() ?? 0,
                $document->id,
            ))
            ->values();
    }

    private function documentState(?ApplicationDocument $document): string
    {
        return match ($document?->review_status) {
            null => 'missing',
            ApplicationDocument::REVIEW_APPROVED => 'approved',
            ApplicationDocument::REVIEW_REJECTED => 'rejected',
            default => 'pending',
        };
    }

    private function transition(
        Application $application,
        string $status,
        string $action,
        User $user,
        ?string $remarks,
    ): Application {
        return DB::transaction(function () use ($application, $status, $action, $user, $remarks) {
            $from = $application->status;

            $application->update([
                'status' => $status,
                'under_review_at' => $application->under_review_at
                    ?? ($status === Application::STATUS_UNDER_REVIEW ? now() : null),
                'staff_remarks' => $remarks ?? $application->staff_remarks,
            ]);

            $this->log($application, $action, $from, $status, $user, $remarks);

            return $application->fresh();
        });
    }

    private function applyRenewalApproval(Application $application): void
    {
        $application->loadMissing('franchise');

        $application->franchise?->update([
            'expiration_date' => CarbonImmutable::create($application->coverage_year ?? now()->year, 12, 31)->toDateString(),
            'franchise_status' => Franchise::STATUS_ACTIVE,
        ]);
    }

    /**
     * Move ownership of the franchise to the proposed new owner. The new
     * owner receives a franchisee record; account linking is done later
     * by BPLO when the new owner registers.
     */
    private function applyTransferApproval(Application $application): void
    {
        $application->loadMissing(['franchise', 'transferDetail']);

        $detail = $application->transferDetail;

        if ($detail === null) {
            throw WorkflowException::conflict('Transfer details are missing from this application.');
        }

        $newOwner = Franchisee::create([
            'first_name' => $detail->new_owner_first_name,
            'middle_name' => $detail->new_owner_middle_name,
            'last_name' => $detail->new_owner_last_name,
            'suffix' => $detail->new_owner_suffix,
            'address' => $detail->new_owner_address,
            'barangay' => $detail->new_owner_barangay,
            'city_municipality' => $detail->new_owner_city_municipality,
            'province' => $detail->new_owner_province,
            'contact_number' => $detail->new_owner_contact_number,
        ]);

        $application->franchise?->update([
            'franchisee_id' => $newOwner->id,
            'franchise_status' => Franchise::STATUS_ACTIVE,
            'remarks' => trim(($application->franchise->remarks ? $application->franchise->remarks."\n" : '')
                ."Ownership transferred under {$application->reference_number}."),
        ]);
    }

    /**
     * Replace the active motor of the franchise with the proposed unit,
     * keeping both assignment records as history.
     */
    private function applyChangeMotorApproval(Application $application): void
    {
        $application->loadMissing(['franchise', 'vehicleChange']);

        $change = $application->vehicleChange;
        $franchise = $application->franchise;

        if ($change === null || $franchise === null) {
            throw WorkflowException::conflict('Change motor details are missing from this application.');
        }

        try {
            $vehicle = Vehicle::create([
                'or_number' => $change->proposed_or_number,
                'cr_number' => $change->proposed_cr_number,
                'motor_number' => $change->proposed_motor_number,
                'chassis_number' => $change->proposed_chassis_number,
                'plate_number' => $change->proposed_plate_number,
                'make' => $change->make,
                'model' => $change->model,
                'year_model' => $change->year_model,
                'color' => $change->color,
                'vehicle_status' => Vehicle::STATUS_ACTIVE,
            ]);
        } catch (QueryException) {
            throw WorkflowException::conflict(
                'The proposed motor number, chassis number, or plate number is already registered to another vehicle.',
            );
        }

        $today = now()->toDateString();

        FranchiseVehicle::query()
            ->where('franchise_id', $franchise->id)
            ->where('assignment_status', 'active')
            ->when($change->existing_vehicle_id !== null, fn ($query) => $query
                ->where('vehicle_id', $change->existing_vehicle_id))
            ->get()
            ->each(function (FranchiseVehicle $assignment) use ($today) {
                $assignment->update([
                    'assignment_status' => 'replaced',
                    'assigned_until' => $assignment->assigned_until ?? $today,
                ]);

                $assignment->vehicle?->update(['vehicle_status' => Vehicle::STATUS_REPLACED]);
            });

        FranchiseVehicle::create([
            'franchise_id' => $franchise->id,
            'vehicle_id' => $vehicle->id,
            'assigned_from' => $today,
            'assignment_status' => 'active',
        ]);
    }

    private function assertCanFile(Franchise $franchise, string $type, string $verb, User $user): void
    {
        if (! $user->canTransact()) {
            throw WorkflowException::forbidden(
                'Verify your mobile number and wait for account activation before filing applications.',
            );
        }

        if (in_array($franchise->franchise_status, self::BLOCKED_FRANCHISE_STATUSES, true)) {
            throw WorkflowException::conflict(
                'A franchise marked as '.str_replace('_', ' ', $franchise->franchise_status)." cannot be {$verb}.",
            );
        }

        $open = $this->openApplication($franchise, $type);

        if ($open !== null) {
            throw WorkflowException::conflict(
                "Application {$open->reference_number} is still open for this franchise.",
                ['franchise_id' => ["Application {$open->reference_number} is already in progress."]],
            );
        }
    }

    private function log(
        Application $application,
        string $action,
        ?string $from,
        string $to,
        User $user,
        ?string $remarks = null,
    ): ApplicationStatusLog {
        return ApplicationStatusLog::create([
            'application_id' => $application->id,
            'from_status' => $from,
            'to_status' => $to,
            'action' => $action,
            'remarks' => $remarks,
            'performed_by' => $user->id,
        ]);
    }

    /**
     * Insert the application with a generated reference number, retrying
     * if another request claimed the same number first.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function createWithReference(array $attributes, string $type): Application
    {
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                return Application::create([
                    ...$attributes,
                    'reference_number' => $this->nextReferenceNumber($type),
                ]);
            } catch (QueryException $exception) {
                if ($attempt === 3 || ! str_contains($exception->getMessage(), 'reference_number')) {
                    throw $exception;
                }
            }
        }

        throw WorkflowException::conflict('A reference number could not be reserved. Please try again.');
    }

    private function nextReferenceNumber(string $type): string
    {
        $prefix = match ($type) {
            Application::TYPE_RENEWAL => 'RNW',
            Application::TYPE_TRANSFER => 'TRF',
            Application::TYPE_CHANGE_MOTOR => 'CHM',
            default => 'APP',
        };

        $year = now()->year;
        $latest = Application::query()
            ->where('application_type', $type)
            ->where('reference_number', 'like', "{$prefix}-{$year}-%")
            ->orderByDesc('id')
            ->value('reference_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, -4)) + 1;

        return sprintf('%s-%d-%04d', $prefix, $year, $sequence);
    }
}
