<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'purpose',
    'mobile_number',
    'code_hash',
    'attempts',
    'max_attempts',
    'expires_at',
    'last_sent_at',
    'consumed_at',
    'revoked_at',
    'ip_address',
])]
class OtpVerification extends Model
{
    protected $table = 'otp_verifications';

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'max_attempts' => 'integer',
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
            'consumed_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Codes that can still be used: not consumed, not revoked, not expired.
     *
     * @param  Builder<OtpVerification>  $query
     * @return Builder<OtpVerification>
     */
    public function scopeUsable(Builder $query): Builder
    {
        return $query
            ->whereNull('consumed_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function hasExhaustedAttempts(): bool
    {
        return $this->attempts >= $this->max_attempts;
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null
            && $this->revoked_at === null
            && ! $this->isExpired()
            && ! $this->hasExhaustedAttempts();
    }
}
