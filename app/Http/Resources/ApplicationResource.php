<?php

namespace App\Http\Resources;

use App\Services\ApplicationWorkflow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $workflow = app(ApplicationWorkflow::class);
        $checklist = $workflow->checklist($this->resource);

        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'application_type' => $this->application_type,
            'type_label' => $this->typeLabel(),
            'status' => $this->status,
            'status_label' => $this->statusLabel(),
            'is_open' => $this->isOpen(),
            'franchise_id' => $this->franchise_id,
            'franchise' => new FranchiseResource($this->whenLoaded('franchise')),
            'franchisee_id' => $this->franchisee_id,
            'franchisee' => new FranchiseeResource($this->whenLoaded('franchisee')),
            'coverage_year' => $this->coverage_year,
            'previous_expiration_date' => $this->previous_expiration_date?->toDateString(),
            'franchisee_remarks' => $this->franchisee_remarks,
            'staff_remarks' => $this->staff_remarks,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'under_review_at' => $this->under_review_at?->toIso8601String(),
            'decided_at' => $this->decided_at?->toIso8601String(),
            'decided_by' => $this->whenLoaded('decidedBy', fn () => $this->decidedBy?->name),
            'transfer_detail' => new TransferDetailResource($this->whenLoaded('transferDetail')),
            'vehicle_change' => new VehicleChangeResource($this->whenLoaded('vehicleChange')),
            'assessment' => new AssessmentResource($this->whenLoaded('assessment')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'certificate' => new CertificateResource($this->whenLoaded('certificate')),
            'summary' => $workflow->summary($this->resource),
            'checklist' => array_map(fn (array $item) => [
                'code' => $item['code'],
                'name' => $item['name'],
                'description' => $item['description'],
                'is_required' => $item['is_required'],
                'state' => $item['state'],
                'submission_count' => $item['submission_count'],
                'latest_document' => $item['latest_document']
                    ? new ApplicationDocumentResource($item['latest_document'])
                    : null,
                'documents' => ApplicationDocumentResource::collection($item['documents']),
            ], $checklist),
            'documents' => ApplicationDocumentResource::collection($this->whenLoaded('documents')),
            'status_history' => $this->whenLoaded('statusLogs', fn () => $workflow->statusHistory($this->resource)),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
