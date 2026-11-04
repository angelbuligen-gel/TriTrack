<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'franchise_id',
    'driver_id',
    'assigned_from',
    'assigned_until',
    'is_primary',
    'assignment_status',
])]
class FranchiseDriver extends Model
{
    protected $table = 'franchise_drivers';

    protected function casts(): array
    {
        return [
            'assigned_from' => 'date',
            'assigned_until' => 'date',
            'is_primary' => 'boolean',
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
     * @return BelongsTo<Driver, $this>
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }
}
