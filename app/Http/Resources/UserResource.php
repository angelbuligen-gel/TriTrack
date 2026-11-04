<?php

namespace App\Http\Resources;

use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'mobile_number' => $this->mobile_number,
            'mobile_number_masked' => PhoneNumber::mask($this->mobile_number),
            'phone_verified' => $this->isPhoneVerified(),
            'phone_verified_at' => $this->phone_verified_at?->toIso8601String(),
            'role' => $this->role,
            'account_status' => $this->account_status,
            'can_transact' => $this->canTransact(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
