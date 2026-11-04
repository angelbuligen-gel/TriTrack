<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'code',
    'name',
    'application_type',
    'amount',
    'description',
    'is_active',
])]
class FeeType extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<AssessmentItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(AssessmentItem::class);
    }

    /**
     * @param  Builder<FeeType>  $query
     * @return Builder<FeeType>
     */
    public function scopeForType(Builder $query, string $type): Builder
    {
        return $query->where('application_type', $type)->where('is_active', true);
    }
}
