<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'application_id',
    'new_owner_first_name',
    'new_owner_middle_name',
    'new_owner_last_name',
    'new_owner_suffix',
    'new_owner_contact_number',
    'new_owner_email',
    'new_owner_address',
    'new_owner_barangay',
    'new_owner_city_municipality',
    'new_owner_province',
    'relationship_to_owner',
    'remarks',
])]
class ApplicationTransferDetail extends Model
{
    /**
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function newOwnerFullName(): string
    {
        return implode(' ', array_values(array_filter([
            $this->new_owner_first_name,
            $this->new_owner_middle_name,
            $this->new_owner_last_name,
            $this->new_owner_suffix,
        ])));
    }
}
