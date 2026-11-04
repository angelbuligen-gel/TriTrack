<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Franchise
 */
class FranchiseAssignmentSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'franchise_number' => $this->franchise_number,
            'franchise_status' => $this->franchise_status,
            'franchisee' => new FranchiseeResource($this->whenLoaded('franchisee')),
        ];
    }
}
