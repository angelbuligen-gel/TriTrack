<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable([
    'user_id',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'birth_date',
    'address',
    'sitio_street',
    'barangay',
    'city',
    'province',
    'contact_number',
])]
class Franchisee extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Franchise, $this> */
    public function franchises(): HasMany
    {
        return $this->hasMany(Franchise::class);
    }

    /** @return HasMany<Driver, Franchise, $this> */
    public function drivers(): HasManyThrough
    {
        return $this->hasManyThrough(
            Driver::class,
            Franchise::class,
            'franchisee_id',
            'id',
            'id',
            'driver_id'
        );
    }

    /** @return HasMany<Vehicle, Franchise, $this> */
    public function vehicles(): HasManyThrough
    {
        return $this->hasManyThrough(
            Vehicle::class,
            Franchise::class,
            'franchisee_id',
            'id',
            'id',
            'vehicle_id'
        );
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class)->orderByDesc('id');
    }

    /** @return HasMany<FranchiseeHistory, $this> */
    public function previousFranchiseeHistories(): HasMany
    {
        return $this->hasMany(FranchiseeHistory::class, 'previous_franchisee_id', 'franchisee_id');
    }

    /** @return HasMany<FranchiseeHistory, $this> */
    public function newFranchiseeHistories(): HasMany
    {
        return $this->hasMany(FranchiseeHistory::class, 'new_franchisee_id', 'franchisee_id');
    }

    public function getFullNameAttribute(): string
    {
        $parts = [$this->first_name, $this->middle_name, $this->last_name, $this->suffix];

        return implode(' ', array_values(array_filter($parts)));
    }

    public function hasLinkedAccount(): bool
    {
        return $this->user_id !== null;
    }

    public function owns(User $user): bool
    {
        return $this->user_id !== null && $this->user_id === $user->id;
    }
}
