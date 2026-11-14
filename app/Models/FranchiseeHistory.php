<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property int $franchisee_history_id
 *  @property int|null $franchise_id
 *  @property int|null $previous_franchisee_id
 *  @property int|null $new_franchisee_id
 *  @property string|null $transfer_date
 *  @property int|null $approved_by
 *  @property string|null $remarks
 *  @property string|null $created_at
 *  @property string|null $updated_at
 */
class FranchiseeHistory extends Model
{
    use HasFactory;

    public $incrementing = true;

    protected $table = 'franchisee_history';

    protected $fillable = [
        'franchise_id',
        'previous_franchisee_id',
        'new_franchisee_id',
        'transfer_date',
        'approved_by',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'franchisee_history_id' => 'integer',
            'franchise_id' => 'integer',
            'previous_franchisee_id' => 'integer',
            'new_franchisee_id' => 'integer',
            'transfer_date' => 'date',
            'approved_by' => 'integer',
        ];
    }

    /** @return BelongsTo<Franchise, $this> */
    public function franchise(): BelongsTo
    {
        return $this->belongsTo(Franchise::class);
    }

    /** @return BelongsTo<Franchisee, $this> */
    public function previousFranchisee(): BelongsTo
    {
        return $this->belongsTo(Franchisee::class, 'previous_franchisee_id', 'franchisee_id');
    }

    /** @return BelongsTo<Franchisee, $this> */
    public function newFranchisee(): BelongsTo
    {
        return $this->belongsTo(Franchisee::class, 'new_franchisee_id', 'franchisee_id');
    }

    /** @return BelongsTo<User, $this> */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by', 'id');
    }

    /**
     * @param Builder<FranchiseeHistory> $query
     * @return Builder<FranchiseeHistory>
     */
    public function scopeForFranchise(Builder $query, int $franchiseId): Builder
    {
        return $query->where('franchise_id', $franchiseId);
    }
}
