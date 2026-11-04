<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\FranchiseVehicle
 */
class FranchiseVehicleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'franchise_id' => $this->franchise_id,
            'vehicle_id' => $this->vehicle_id,
            'vehicle' => new VehicleResource($this->whenLoaded('vehicle')),
            'assigned_from' => $this->assigned_from?->toDateString(),
            'assigned_until' => $this->assigned_until?->toDateString(),
            'assignment_status' => $this->assignment_status,
        ];
    }
}
