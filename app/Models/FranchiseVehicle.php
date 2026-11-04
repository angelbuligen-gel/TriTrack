<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'franchise_id',
    'vehicle_id',
    'assigned_from',
    'assigned_until',
    'assignment_status',
])]
class FranchiseVehicle extends Model
{
    protected $table = 'franchise_vehicles';

    protected function casts(): array
    {
        return [
            'assigned_from' => 'date',
            'assigned_until' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Franchise, $this>
     */
    public function franchise(): BelongsTo
    {
        return $this->belongsTo(Franchise::class);
    }

    /**
     * @return BelongsTo<Vehicle, $this>
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
