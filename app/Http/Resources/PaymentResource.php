<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Payment
 */
class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'assessment_id' => $this->assessment_id,
            'application_id' => $this->application_id,
            'franchisee_id' => $this->franchisee_id,
            'franchisee' => new FranchiseeResource($this->whenLoaded('franchisee')),
            'application' => new ApplicationResource($this->whenLoaded('application')),
            'assessment' => new AssessmentResource($this->whenLoaded('assessment')),
            'provider' => $this->provider,
            'provider_reference' => $this->provider_reference,
            'method' => $this->method,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'checkout_url' => $this->checkout_url,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'verified_by' => $this->whenLoaded('verifiedBy', fn () => $this->verifiedBy?->name),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'failure_reason' => $this->failure_reason,
            'events' => PaymentEventResource::collection($this->whenLoaded('events')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
