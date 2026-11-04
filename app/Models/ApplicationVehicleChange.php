<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'application_id',
    'existing_vehicle_id',
    'proposed_motor_number',
    'proposed_chassis_number',
    'proposed_plate_number',
    'proposed_or_number',
    'proposed_cr_number',
    'make',
    'model',
    'year_model',
    'color',
    'remarks',
])]
class ApplicationVehicleChange extends Model
{
    protected function casts(): array
    {
        return [
            'year_model' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * @return BelongsTo<Vehicle, $this>
     */
    public function existingVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'existing_vehicle_id');
    }
}
