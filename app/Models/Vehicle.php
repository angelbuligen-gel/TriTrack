<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable([
    'or_number',
    'cr_number',
    'motor_number',
    'chassis_number',
    'plate_number',
    'make',
    'model',
    'year_model',
    'color',
    'vehicle_status',
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

    /**
     * @return HasMany<FranchiseVehicle, $this>
     */
    public function franchiseAssignments(): HasMany
    {
        return $this->hasMany(FranchiseVehicle::class)->orderByDesc('assigned_from');
    }

    /**
     * Franchises this vehicle is currently assigned to.
     *
     * @return HasManyThrough<Franchise, FranchiseVehicle, $this>
     */
    public function currentFranchises(): HasManyThrough
    {
        return $this->hasManyThrough(
            Franchise::class,
            FranchiseVehicle::class,
            'vehicle_id',
            'id',
            'id',
            'franchise_id',
        )->where('franchise_vehicles.assignment_status', 'active');
    }

    /**
     * @param  Builder<Vehicle>  $query
     * @return Builder<Vehicle>
     */
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
            ->orWhere('make', 'like', "%{$keyword}%");
    }

    public function getDisplayAttribute(): string
    {
        return trim(sprintf('%s %s %s', $this->make, $this->model, $this->plate_number));
    }
}
