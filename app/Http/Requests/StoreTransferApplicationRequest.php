<?php

namespace App\Http\Requests;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class StoreTransferApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('new_owner_contact_number')) {
            $this->merge([
                'new_owner_contact_number' => PhoneNumber::normalize($this->input('new_owner_contact_number'))
                    ?? $this->input('new_owner_contact_number'),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'franchise_id' => ['required', 'integer', 'exists:franchises,id'],
            'new_owner_first_name' => ['required', 'string', 'max:80'],
            'new_owner_middle_name' => ['nullable', 'string', 'max:80'],
            'new_owner_last_name' => ['required', 'string', 'max:80'],
            'new_owner_suffix' => ['nullable', 'string', 'max:20'],
            'new_owner_contact_number' => ['required', 'string', 'max:20', 'regex:'.PhoneNumber::PATTERN],
            'new_owner_email' => ['nullable', 'string', 'email', 'max:150'],
            'new_owner_address' => ['required', 'string', 'max:500'],
            'new_owner_barangay' => ['nullable', 'string', 'max:100'],
            'new_owner_city_municipality' => ['nullable', 'string', 'max:100'],
            'new_owner_province' => ['nullable', 'string', 'max:100'],
            'relationship_to_owner' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'franchisee_remarks' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'franchise_id.required' => 'Select the franchise you are transferring.',
            'new_owner_contact_number.regex' => 'Enter a valid Philippine mobile number (e.g. 09171234567).',
            'new_owner_address.required' => 'Enter the complete address of the proposed new owner.',
        ];
    }
}
