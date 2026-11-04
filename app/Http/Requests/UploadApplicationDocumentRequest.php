<?php

namespace App\Http\Requests;

use App\Services\ApplicationDocumentStorage;
use Illuminate\Foundation\Http\FormRequest;

class UploadApplicationDocumentRequest extends FormRequest
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
            'requirement_code' => ['required', 'string', 'max:50'],
            'file' => [
                'required',
                'file',
                'max:'.ApplicationDocumentStorage::MAX_KILOBYTES,
                'mimes:pdf,jpg,jpeg,png,webp',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.max' => 'Each document must be 10 MB or smaller.',
            'file.mimes' => 'Only PDF, JPG, PNG, or WEBP files are accepted.',
            'requirement_code.required' => 'Select which requirement the document satisfies.',
        ];
    }
}
