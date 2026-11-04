<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssessmentRequest extends FormRequest
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
            'remarks' => ['nullable', 'string', 'max:1000'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.fee_type_id' => ['nullable', 'integer', 'exists:fee_types,id'],
            'items.*.description' => ['required_without:items.*.fee_type_id', 'nullable', 'string', 'max:150'],
            'items.*.amount' => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.*.amount.min' => 'Each assessment item must have an amount greater than zero.',
        ];
    }
}
