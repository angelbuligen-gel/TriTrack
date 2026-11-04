<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'application_type',
    'code',
    'name',
    'description',
    'is_required',
    'sort_order',
])]
class DocumentRequirement extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @param  Builder<DocumentRequirement>  $query
     * @return Builder<DocumentRequirement>
     */
    public function scopeForType(Builder $query, string $type): Builder
    {
        return $query
            ->where('application_type', $type)
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
