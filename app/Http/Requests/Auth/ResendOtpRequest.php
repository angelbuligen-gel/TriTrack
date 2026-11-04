<?php

namespace App\Http\Requests\Auth;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class ResendOtpRequest extends FormRequest
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
            'mobile_number' => ['required', 'string', 'regex:'.PhoneNumber::PATTERN],
        ];
    }
}
