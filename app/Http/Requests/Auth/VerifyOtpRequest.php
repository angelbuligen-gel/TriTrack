<?php

namespace App\Http\Requests\Auth;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
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
                'otp' => preg_replace('/\s+/', '', (string) $this->input('otp')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'mobile_number' => ['required', 'string', 'regex:'.PhoneNumber::PATTERN],
            'otp' => ['required', 'digits:6'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mobile_number.regex' => 'Enter a valid Philippine mobile number.',
            'otp.digits' => 'The verification code must be 6 digits.',
        ];
    }
}
