<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('mobile_number')) {
            $this->merge([
                'mobile_number' => PhoneNumber::normalize($this->input('mobile_number'))
                    ?? $this->input('mobile_number'),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'username' => ['nullable', 'string', 'max:50', 'unique:users,username'],
            'mobile_number' => ['nullable', 'string', 'regex:'.PhoneNumber::PATTERN, 'unique:users,mobile_number'],
            'role' => ['required', Rule::in([
                User::ROLE_BPLO,
                User::ROLE_TREASURY,
                User::ROLE_ADMINISTRATOR,
            ])],
            'account_status' => ['required', Rule::in([User::STATUS_ACTIVE, User::STATUS_PENDING])],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }
}
