<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'application_id',
    'assessment_number',
    'assessed_by',
    'assessed_at',
    'total_amount',
    'status',
    'remarks',
])]
class Assessment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_CANCELLED = 'cancelled';

    protected function casts(): array
    {
        return [
            'assessed_at' => 'datetime',
            'total_amount' => 'decimal:2',
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
     * @return BelongsTo<User, $this>
     */
    public function assessedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessed_by');
    }

    /**
     * @return HasMany<AssessmentItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(AssessmentItem::class)->orderBy('id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderByDesc('id');
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}
