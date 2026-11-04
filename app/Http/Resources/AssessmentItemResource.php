<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\AssessmentItem
 */
class AssessmentItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_type_id' => $this->fee_type_id,
            'fee_type' => $this->whenLoaded('feeType', fn () => $this->feeType?->name),
            'description' => $this->description,
            'amount' => (float) $this->amount,
        ];
    }
}
