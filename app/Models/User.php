<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'username',
    'email',
    'mobile_number',
    'password',
    'role',
    'account_status',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_FRANCHISEE = 'franchisee';

    public const ROLE_BPLO = 'bplo';

    public const ROLE_TREASURY = 'treasury';

    public const ROLE_ADMINISTRATOR = 'administrator';

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_REJECTED = 'rejected';

    public const ROLES = [
        self::ROLE_FRANCHISEE,
        self::ROLE_BPLO,
        self::ROLE_TREASURY,
        self::ROLE_ADMINISTRATOR,
    ];

    protected $table = 'users';

    /** @return HasMany<OtpVerification, $this> */
    public function otpVerifications(): HasMany
    {
        return $this->hasMany(OtpVerification::class);
    }

    /** @return HasOne<Franchisee, $this> */
    public function franchiseeProfile(): HasOne
    {
        return $this->hasOne(Franchisee::class);
    }

    /** @return HasMany<UserNotification, $this> */
    public function appNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class)->orderByDesc('id');
    }

    /** @return HasMany<ActivityLog, $this> */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class)->orderByDesc('id');
    }

    /** @return HasMany<FranchiseeHistory, $this> */
    public function franchiseeHistories(): HasMany
    {
        return $this->hasMany(FranchiseeHistory::class, 'approved_by', 'id');
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isFranchisee(): bool
    {
        return $this->role === self::ROLE_FRANCHISEE;
    }

    public function isPhoneVerified(): bool
    {
        return $this->phone_verified_at !== null;
    }

    public function isSuspended(): bool
    {
        return in_array($this->account_status, [
            self::STATUS_SUSPENDED,
            self::STATUS_REJECTED,
        ], true);
    }

    /** Franchise transactions require a verified number and an
     * administrator-activated account.
     */
    public function canTransact(): bool
    {
        if ($this->account_status !== self::STATUS_ACTIVE) {
            return false;
        }

        return ! $this->isFranchisee() || $this->isPhoneVerified();
    }
}
