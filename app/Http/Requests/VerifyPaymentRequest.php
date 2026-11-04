<?php

namespace App\Http\Requests;

use App\Models\Payment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VerifyPaymentRequest extends FormRequest
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
            'status' => ['required', 'string', Rule::in([
                Payment::STATUS_SUCCESSFUL,
                Payment::STATUS_FAILED,
                Payment::STATUS_CANCELLED,
            ])],
            'provider_reference' => ['nullable', 'string', 'max:120'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
