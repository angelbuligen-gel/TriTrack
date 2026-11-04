<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignmentRequest extends FormRequest
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
            'driver_id' => ['sometimes', 'nullable', 'integer', 'exists:drivers,id'],
            'vehicle_id' => ['sometimes', 'nullable', 'integer', 'exists:vehicles,id'],
            'assigned_from' => ['required', 'date'],
            'assigned_until' => ['nullable', 'date', 'after_or_equal:assigned_from'],
            'is_primary' => ['sometimes', 'boolean'],
            'assignment_status' => ['sometimes', 'string', Rule::in(['active', 'ended', 'replaced'])],
        ];
    }
}
