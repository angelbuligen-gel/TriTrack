<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ApplicationVehicleChange
 */
class VehicleChangeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'existing_vehicle_id' => $this->existing_vehicle_id,
            'existing_vehicle' => new VehicleResource($this->whenLoaded('existingVehicle')),
            'proposed' => [
                'motor_number' => $this->proposed_motor_number,
                'chassis_number' => $this->proposed_chassis_number,
                'plate_number' => $this->proposed_plate_number,
                'or_number' => $this->proposed_or_number,
                'cr_number' => $this->proposed_cr_number,
                'make' => $this->make,
                'model' => $this->model,
                'year_model' => $this->year_model,
                'color' => $this->color,
            ],
            'remarks' => $this->remarks,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
