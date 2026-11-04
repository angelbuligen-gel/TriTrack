<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreChangeMotorApplicationRequest extends FormRequest
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
            'existing_vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'proposed_motor_number' => ['required', 'string', 'max:80'],
            'proposed_chassis_number' => ['nullable', 'string', 'max:80'],
            'proposed_plate_number' => ['nullable', 'string', 'max:30'],
            'proposed_or_number' => ['nullable', 'string', 'max:60'],
            'proposed_cr_number' => ['nullable', 'string', 'max:60'],
            'make' => ['nullable', 'string', 'max:80'],
            'model' => ['nullable', 'string', 'max:80'],
            'year_model' => ['nullable', 'integer', 'min:1950', 'max:'.(now()->year + 2)],
            'color' => ['nullable', 'string', 'max:40'],
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
            'existing_vehicle_id.required' => 'Select which active motor is being replaced.',
            'proposed_motor_number.required' => 'Enter the motor number of the replacement unit.',
        ];
    }
}
