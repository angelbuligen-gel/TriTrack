<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\FranchiseDriver
 */
class FranchiseDriverResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'franchise_id' => $this->franchise_id,
            'driver_id' => $this->driver_id,
            'driver' => new DriverResource($this->whenLoaded('driver')),
            'assigned_from' => $this->assigned_from?->toDateString(),
            'assigned_until' => $this->assigned_until?->toDateString(),
            'is_primary' => $this->is_primary,
            'assignment_status' => $this->assignment_status,
        ];
    }
}
