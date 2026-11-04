<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InitiatePaymentRequest extends FormRequest
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
            'assessment_id' => ['required', 'integer', 'exists:assessments,id'],
            'method' => ['nullable', 'string', Rule::in([
                'online', 'gcash', 'maya', 'card', 'bank_transfer', 'cash',
            ])],
        ];
    }
}
