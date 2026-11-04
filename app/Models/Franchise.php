<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

#[Fillable([
    'franchisee_id',
    'franchise_number',
    'date_issued',
    'expiration_date',
    'franchise_status',
    'remarks',
])]
class Franchise extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_FOR_RENEWAL = 'for_renewal';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_TRANSFERRED = 'transferred';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_FOR_RENEWAL,
        self::STATUS_EXPIRED,
        self::STATUS_SUSPENDED,
        self::STATUS_CANCELLED,
        self::STATUS_TRANSFERRED,
    ];

    protected function casts(): array
    {
        return [
            'date_issued' => 'date',
            'expiration_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Franchisee, $this>
     */
    public function franchisee(): BelongsTo
    {
        return $this->belongsTo(Franchisee::class);
    }

    /**
     * The motor currently assigned to this franchise.
     *
     * @return HasOneThrough<Vehicle, FranchiseVehicle, $this>
     */
    public function activeVehicle(): HasOneThrough
    {
        return $this->hasOneThrough(
            Vehicle::class,
            FranchiseVehicle::class,
            'franchise_id',
            'id',
            'id',
            'vehicle_id',
        )->where('franchise_vehicles.assignment_status', 'active');
    }

    /**
     * Active driver assignments for this franchise.
     *
     * @return HasMany<FranchiseDriver, $this>
     */
    public function driverAssignments(): HasMany
    {
        return $this->hasMany(FranchiseDriver::class)->where('assignment_status', 'active');
    }

    /**
     * Active vehicle assignments for this franchise.
     *
     * @return HasMany<FranchiseVehicle, $this>
     */
    public function vehicleAssignments(): HasMany
    {
        return $this->hasMany(FranchiseVehicle::class)->where('assignment_status', 'active');
    }

    /**
     * @return HasMany<FranchiseDriver, $this>
     */
    public function driverHistory(): HasMany
    {
        return $this->hasMany(FranchiseDriver::class)->orderByDesc('assigned_from');
    }

    /**
     * @return HasMany<FranchiseVehicle, $this>
     */
    public function vehicleHistory(): HasMany
    {
        return $this->hasMany(FranchiseVehicle::class)->orderByDesc('assigned_from');
    }

    /**
     * Renewal, transfer, and change motor applications filed for this franchise.
     *
     * @return HasMany<Application, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class)->orderByDesc('id');
    }

    /**
     * @param  Builder<Franchise>  $query
     * @return Builder<Franchise>
     */
    public function scopeSearch(Builder $query, ?string $keyword): Builder
    {
        if (blank($keyword)) {
            return $query;
        }

        return $query->where(function (Builder $inner) use ($keyword) {
            $inner
                ->where('franchise_number', 'like', "%{$keyword}%")
                ->orWhereHas('franchisee', function (Builder $franchisee) use ($keyword) {
                    $franchisee
                        ->where('first_name', 'like', "%{$keyword}%")
                        ->orWhere('last_name', 'like', "%{$keyword}%");
                });
        });
    }

    public function isExpired(): bool
    {
        return $this->expiration_date !== null
            && $this->expiration_date->isPast();
    }
}
