<?php

namespace App\Http\Requests\Auth;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'mobile_number' => [
                'required',
                'string',
                'regex:'.PhoneNumber::PATTERN,
                'unique:users,mobile_number',
            ],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->letters()->numbers(),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mobile_number.regex' => 'Enter a valid Philippine mobile number (e.g. 09171234567).',
            'mobile_number.unique' => 'This mobile number is already registered to another account.',
        ];
    }
}
