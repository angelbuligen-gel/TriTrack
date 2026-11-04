<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRenewalApplicationRequest extends FormRequest
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
            'franchise_id' => ['required', 'integer', 'exists:franchises,id'],
            'franchisee_remarks' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'franchise_id.required' => 'Select the franchise you are renewing.',
            'franchise_id.exists' => 'The selected franchise does not exist.',
        ];
    }
}
