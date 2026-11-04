<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Assessment
 */
class AssessmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'assessment_number' => $this->assessment_number,
            'status' => $this->status,
            'is_paid' => $this->isPaid(),
            'total_amount' => (float) $this->total_amount,
            'remarks' => $this->remarks,
            'assessed_by' => $this->whenLoaded('assessedBy', fn () => $this->assessedBy?->name),
            'assessed_at' => $this->assessed_at?->toIso8601String(),
            'items' => AssessmentItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
