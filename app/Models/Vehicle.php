<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'make_brand',
    'or_number',
    'cr_number',
    'motor_number',
    'chassis_number',
    'plate_number',
    'or_year',
    'color',
    'vehicle_status',
    'vehicle_id',
])]
class Vehicle extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_REPLACED = 'replaced';

    public const STATUS_RETIRED = 'retired';

    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_ACTIVE,
        self::STATUS_REPLACED,
        self::STATUS_RETIRED,
        self::STATUS_REJECTED,
    ];

    /** @return HasOne<Franchise, $this> */
    public function franchise(): HasOne
    {
        return $this->hasOne(Franchise::class, 'vehicle_id', 'id');
    }

    /** @return HasMany<FranchiseVehicle, $this> */
    public function franchiseAssignments(): HasMany
    {
        return $this->hasMany(FranchiseVehicle::class)->orderByDesc('assigned_from');
    }

    /** @return HasMany<VehicleHistory, $this> */
    public function vehicleHistory(): HasMany
    {
        return $this->hasMany(VehicleHistory::class, 'vehicle_id', 'id');
    }

    /** @return HasMany<VehicleHistory, $this> */
    public function currentFranchiseAssignments(): HasMany
    {
        return $this->hasMany(FranchiseVehicle::class)
            ->where('assignment_status', 'active')
            ->orderByDesc('assigned_from');
    }

    /** @param Builder<Vehicle> $query */
    public function scopeSearch(Builder $query, ?string $keyword): Builder
    {
        if (blank($keyword)) {
            return $query;
        }

        return $query
            ->where('plate_number', 'like', "%{$keyword}%")
            ->orWhere('motor_number', 'like', "%{$keyword}%")
            ->orWhere('chassis_number', 'like', "%{$keyword}%")
            ->orWhere('or_number', 'like', "%{$keyword}%")
            ->orWhere('make_brand', 'like', "%{$keyword}%");
    }

    public function getDisplayAttribute(): string
    {
        return trim(sprintf('%s %s %s', $this->make_brand, $this->model, $this->plate_number));
    }
}
