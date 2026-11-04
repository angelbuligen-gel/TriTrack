<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Driver
 */
class DriverResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'suffix' => $this->suffix,
            'license_number' => $this->license_number,
            'license_expiry' => $this->license_expiry?->toDateString(),
            'license_expired' => $this->hasExpiredLicense(),
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'current_franchises' => FranchiseAssignmentSummaryResource::collection(
                $this->whenLoaded('currentFranchises'),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
