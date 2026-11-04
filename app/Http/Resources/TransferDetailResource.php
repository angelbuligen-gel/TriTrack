<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ApplicationTransferDetail
 */
class TransferDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'new_owner' => [
                'full_name' => $this->newOwnerFullName(),
                'first_name' => $this->new_owner_first_name,
                'middle_name' => $this->new_owner_middle_name,
                'last_name' => $this->new_owner_last_name,
                'suffix' => $this->new_owner_suffix,
                'contact_number' => $this->new_owner_contact_number,
                'email' => $this->new_owner_email,
                'address' => $this->new_owner_address,
                'barangay' => $this->new_owner_barangay,
                'city_municipality' => $this->new_owner_city_municipality,
                'province' => $this->new_owner_province,
            ],
            'relationship_to_owner' => $this->relationship_to_owner,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
