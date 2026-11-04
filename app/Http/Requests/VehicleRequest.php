<?php

namespace App\Http\Requests;

use App\Models\Vehicle;
use Illuminate\Foundation\Http\FormRequest;

class VehicleRequest extends FormRequest
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
        $creating = $this->isMethod('POST');
        $required = $creating ? 'required' : 'sometimes';
        $optional = $creating ? 'nullable' : 'sometimes';

        return [
            'or_number' => [$optional, 'nullable', 'string', 'max:60'],
            'cr_number' => [$optional, 'nullable', 'string', 'max:60'],
            'motor_number' => [$required, 'string', 'max:80', 'unique:vehicles,motor_number'],
            'chassis_number' => [$optional, 'nullable', 'string', 'max:80', 'unique:vehicles,chassis_number'],
            'plate_number' => [$optional, 'nullable', 'string', 'max:30', 'unique:vehicles,plate_number'],
            'make' => [$optional, 'nullable', 'string', 'max:80'],
            'model' => [$optional, 'nullable', 'string', 'max:80'],
            'year_model' => ['sometimes', 'nullable', 'integer', 'between:1900,2100'],
            'color' => [$optional, 'nullable', 'string', 'max:40'],
            'vehicle_status' => ['sometimes', 'string', 'in:'.implode(',', Vehicle::STATUSES)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'motor_number.unique' => 'This motor number is already registered to another vehicle.',
            'chassis_number.unique' => 'This chassis number is already registered to another vehicle.',
            'plate_number.unique' => 'This plate number is already registered to another vehicle.',
        ];
    }
}
