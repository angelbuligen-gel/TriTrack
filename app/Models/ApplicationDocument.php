<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'application_id',
    'requirement_code',
    'document_type',
    'original_name',
    'file_path',
    'mime_type',
    'file_size',
    'uploaded_by',
    'uploaded_at',
    'review_status',
    'reviewed_by',
    'reviewed_at',
    'review_remarks',
    'ml_status',
    'ml_document_type',
    'ml_extracted',
    'ml_confidence',
    'ml_processed_at',
    'ml_error',
    'ml_verified_at',
    'ml_verified_by',
    'ml_review_remarks',
])]
class ApplicationDocument extends Model
{
    use HasFactory;

    public const REVIEW_PENDING = 'pending';

    public const REVIEW_APPROVED = 'approved';

    public const REVIEW_REJECTED = 'rejected';

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'uploaded_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'ml_extracted' => 'array',
            'ml_confidence' => 'float',
            'ml_processed_at' => 'datetime',
            'ml_verified_at' => 'datetime',
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
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function mlVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ml_verified_by');
    }

    public function isReviewed(): bool
    {
        return $this->review_status !== self::REVIEW_PENDING;
    }

    public function humanSize(): string
    {
        $bytes = (int) $this->file_size;

        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1).' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1).' KB';
        }

        return $bytes.' B';
    }
}
