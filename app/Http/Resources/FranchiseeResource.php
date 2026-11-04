<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Franchisee
 */
class FranchiseeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'full_name' => $this->full_name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'suffix' => $this->suffix,
            'birth_date' => $this->birth_date?->toDateString(),
            'address' => $this->address,
            'barangay' => $this->barangay,
            'city_municipality' => $this->city_municipality,
            'province' => $this->province,
            'contact_number' => $this->contact_number,
            'linked_account' => $this->whenLoaded('user', fn () => [
                'id' => $this->user?->id,
                'email' => $this->user?->email,
                'mobile_number' => $this->user?->mobile_number,
                'account_status' => $this->user?->account_status,
                'phone_verified' => $this->user?->isPhoneVerified(),
            ]),
            'franchise_count' => $this->whenLoaded('franchises', fn () => $this->franchises->count()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
