<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'reference_number',
    'franchise_id',
    'franchisee_id',
    'application_type',
    'status',
    'coverage_year',
    'previous_expiration_date',
    'franchisee_remarks',
    'staff_remarks',
    'submitted_at',
    'under_review_at',
    'decided_at',
    'decided_by',
])]
class Application extends Model
{
    use HasFactory;

    public const TYPE_RENEWAL = 'renewal';

    public const TYPE_TRANSFER = 'transfer';

    public const TYPE_CHANGE_MOTOR = 'change_motor';

    public const TYPES = [
        self::TYPE_RENEWAL,
        self::TYPE_TRANSFER,
        self::TYPE_CHANGE_MOTOR,
    ];

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_DOCUMENTS_PENDING = 'documents_pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_COMPLETED = 'completed';

    public const STATUSES = [
        self::STATUS_SUBMITTED,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_DOCUMENTS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_CANCELLED,
        self::STATUS_COMPLETED,
    ];

    /**
     * Statuses that still need a decision. A franchisee may not file a
     * second application of the same type while one of these is open.
     */
    public const OPEN_STATUSES = [
        self::STATUS_SUBMITTED,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_DOCUMENTS_PENDING,
    ];

    protected function casts(): array
    {
        return [
            'coverage_year' => 'integer',
            'previous_expiration_date' => 'date',
            'submitted_at' => 'datetime',
            'under_review_at' => 'datetime',
            'decided_at' => 'datetime',
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
     * @return BelongsTo<Franchisee, $this>
     */
    public function franchisee(): BelongsTo
    {
        return $this->belongsTo(Franchisee::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    /**
     * Every document ever submitted for this application, newest first.
     *
     * @return HasMany<ApplicationDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(ApplicationDocument::class)->orderByDesc('uploaded_at')->orderByDesc('id');
    }

    /**
     * @return HasMany<ApplicationStatusLog, $this>
     */
    public function statusLogs(): HasMany
    {
        return $this->hasMany(ApplicationStatusLog::class)->orderBy('created_at')->orderBy('id');
    }

    /**
     * @return HasOne<ApplicationTransferDetail, $this>
     */
    public function transferDetail(): HasOne
    {
        return $this->hasOne(ApplicationTransferDetail::class);
    }

    /**
     * @return HasOne<ApplicationVehicleChange, $this>
     */
    public function vehicleChange(): HasOne
    {
        return $this->hasOne(ApplicationVehicleChange::class);
    }

    /**
     * @return HasOne<Assessment, $this>
     */
    public function assessment(): HasOne
    {
        return $this->hasOne(Assessment::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderByDesc('id');
    }

    /**
     * @return HasOne<Certificate, $this>
     */
    public function certificate(): HasOne
    {
        return $this->hasOne(Certificate::class);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    public function isDecided(): bool
    {
        return in_array($this->status, [
            self::STATUS_APPROVED,
            self::STATUS_REJECTED,
            self::STATUS_CANCELLED,
            self::STATUS_COMPLETED,
        ], true);
    }

    public function typeLabel(): string
    {
        return match ($this->application_type) {
            self::TYPE_RENEWAL => 'Franchise Renewal',
            self::TYPE_TRANSFER => 'Franchise Transfer',
            self::TYPE_CHANGE_MOTOR => 'Change Motor',
            default => ucfirst(str_replace('_', ' ', (string) $this->application_type)),
        };
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            self::STATUS_SUBMITTED => 'Submitted',
            self::STATUS_UNDER_REVIEW => 'Under review',
            self::STATUS_DOCUMENTS_PENDING => 'Documents pending',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_CANCELLED => 'Cancelled',
            self::STATUS_COMPLETED => 'Completed',
            default => ucfirst(str_replace('_', ' ', $this->status)),
        };
    }

    /**
     * @param  Builder<Application>  $query
     * @return Builder<Application>
     */
    public function scopeOfType(Builder $query, ?string $type): Builder
    {
        return blank($type) ? $query : $query->where('application_type', $type);
    }

    /**
     * @param  Builder<Application>  $query
     * @return Builder<Application>
     */
    public function scopeWithStatus(Builder $query, ?string $status): Builder
    {
        return blank($status) ? $query : $query->where('status', $status);
    }

    /**
     * @param  Builder<Application>  $query
     * @return Builder<Application>
     */
    public function scopeSearch(Builder $query, ?string $keyword): Builder
    {
        if (blank($keyword)) {
            return $query;
        }

        return $query->where(function (Builder $inner) use ($keyword) {
            $inner
                ->where('reference_number', 'like', "%{$keyword}%")
                ->orWhereHas('franchise', fn (Builder $franchise) => $franchise
                    ->where('franchise_number', 'like', "%{$keyword}%"))
                ->orWhereHas('franchisee', fn (Builder $franchisee) => $franchisee
                    ->where('first_name', 'like', "%{$keyword}%")
                    ->orWhere('last_name', 'like', "%{$keyword}%"));
        });
    }
}
