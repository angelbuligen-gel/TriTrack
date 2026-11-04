<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Franchise
 */
class FranchiseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'franchise_number' => $this->franchise_number,
            'franchisee_id' => $this->franchisee_id,
            'franchisee' => new FranchiseeResource($this->whenLoaded('franchisee')),
            'date_issued' => $this->date_issued?->toDateString(),
            'expiration_date' => $this->expiration_date?->toDateString(),
            'franchise_status' => $this->franchise_status,
            'is_expired' => $this->isExpired(),
            'remarks' => $this->remarks,
            'drivers' => FranchiseDriverResource::collection($this->whenLoaded('driverAssignments')),
            'vehicles' => FranchiseVehicleResource::collection($this->whenLoaded('vehicleAssignments')),
            'driver_history' => FranchiseDriverResource::collection($this->whenLoaded('driverHistory')),
            'vehicle_history' => FranchiseVehicleResource::collection($this->whenLoaded('vehicleHistory')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
