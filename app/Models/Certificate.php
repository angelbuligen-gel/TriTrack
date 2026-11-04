<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'application_id',
    'certificate_number',
    'certificate_type',
    'issued_by',
    'issued_at',
    'file_path',
    'metadata',
])]
class Certificate extends Model
{
    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'metadata' => 'array',
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
    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function typeLabel(): string
    {
        return match ($this->certificate_type) {
            Application::TYPE_RENEWAL => 'Franchise Renewal Certificate',
            Application::TYPE_TRANSFER => 'Franchise Transfer Certificate',
            Application::TYPE_CHANGE_MOTOR => 'Change Motor Certificate',
            default => 'Franchise Certificate',
        };
    }
}
