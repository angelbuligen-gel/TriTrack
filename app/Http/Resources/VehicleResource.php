<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Vehicle
 */
class VehicleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'or_number' => $this->or_number,
            'cr_number' => $this->cr_number,
            'motor_number' => $this->motor_number,
            'chassis_number' => $this->chassis_number,
            'plate_number' => $this->plate_number,
            'make' => $this->make,
            'model' => $this->model,
            'display' => $this->display,
            'year_model' => $this->year_model,
            'color' => $this->color,
            'vehicle_status' => $this->vehicle_status,
            'current_franchises' => FranchiseAssignmentSummaryResource::collection(
                $this->whenLoaded('currentFranchises'),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
