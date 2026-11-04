<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'username' => ['sometimes', 'nullable', 'string', 'max:50', Rule::unique('users', 'username')->ignore($this->route('user'))],
            'role' => ['sometimes', Rule::in(User::ROLES)],
            'account_status' => ['sometimes', Rule::in([
                User::STATUS_PENDING,
                User::STATUS_ACTIVE,
                User::STATUS_SUSPENDED,
                User::STATUS_REJECTED,
            ])],
        ];
    }
}
