<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable([
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'license_number',
    'license_expiry',
    'contact_number',
    'address',
])]
class Driver extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date',
        ];
    }

    /**
     * @return HasMany<FranchiseDriver, $this>
     */
    public function franchiseAssignments(): HasMany
    {
        return $this->hasMany(FranchiseDriver::class)->orderByDesc('assigned_from');
    }

    /**
     * Franchises this driver is currently assigned to.
     *
     * @return HasManyThrough<Franchise, FranchiseDriver, $this>
     */
    public function currentFranchises(): HasManyThrough
    {
        return $this->hasManyThrough(
            Franchise::class,
            FranchiseDriver::class,
            'driver_id',
            'id',
            'id',
            'franchise_id',
        )->where('franchise_drivers.assignment_status', 'active');
    }

    /**
     * @param  Builder<Driver>  $query
     * @return Builder<Driver>
     */
    public function scopeSearch(Builder $query, ?string $keyword): Builder
    {
        if (blank($keyword)) {
            return $query;
        }

        return $query
            ->where('first_name', 'like', "%{$keyword}%")
            ->orWhere('last_name', 'like', "%{$keyword}%")
            ->orWhere('license_number', 'like', "%{$keyword}%");
    }

    public function getFullNameAttribute(): string
    {
        $parts = [$this->first_name, $this->middle_name, $this->last_name, $this->suffix];

        return implode(' ', array_values(array_filter($parts)));
    }

    public function hasExpiredLicense(): bool
    {
        return $this->license_expiry !== null && $this->license_expiry->isPast();
    }
}
