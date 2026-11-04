<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'assessment_id',
    'application_id',
    'franchisee_id',
    'reference_number',
    'provider',
    'provider_reference',
    'method',
    'amount',
    'currency',
    'status',
    'checkout_url',
    'paid_at',
    'verified_by',
    'verified_at',
    'failure_reason',
])]
class Payment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SUCCESSFUL = 'successful';

    public const STATUS_FAILED = 'failed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_REFUNDED = 'refunded';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SUCCESSFUL,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
        self::STATUS_REFUNDED,
    ];

    public const OPEN_STATUSES = [
        self::STATUS_PENDING,
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Assessment, $this>
     */
    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    /**
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * @return BelongsTo<Franchisee, $this>
     */
    public function franchisee(): BelongsTo
    {
        return $this->belongsTo(Franchisee::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * @return HasMany<PaymentEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(PaymentEvent::class)->orderByDesc('id');
    }

    public function isSuccessful(): bool
    {
        return $this->status === self::STATUS_SUCCESSFUL;
    }
}
