<?php

namespace App\Http\Requests;

use App\Models\ApplicationDocument;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewDocumentRequest extends FormRequest
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
            'review_status' => [
                'required',
                'string',
                Rule::in([ApplicationDocument::REVIEW_APPROVED, ApplicationDocument::REVIEW_REJECTED]),
            ],
            'review_remarks' => ['required_if:review_status,rejected', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'review_remarks.required_if' => 'Explain what needs to be corrected when rejecting a document.',
        ];
    }
}
