<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmExtractionRequest extends FormRequest
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
            'extracted_data' => ['required', 'array', 'min:1'],
            'extracted_data.*' => ['nullable', 'string', 'max:1000'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
