<?php

namespace App\Http\Requests;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class DriverRequest extends FormRequest
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
            'first_name' => [$required, 'string', 'max:80'],
            'middle_name' => [$optional, 'nullable', 'string', 'max:80'],
            'last_name' => [$required, 'string', 'max:80'],
            'suffix' => [$optional, 'nullable', 'string', 'max:20'],
            'license_number' => [$optional, 'nullable', 'string', 'max:60', 'unique:drivers,license_number'],
            'license_expiry' => [$optional, 'nullable', 'date'],
            'contact_number' => [$optional, 'nullable', 'string', 'regex:'.PhoneNumber::PATTERN],
            'address' => [$optional, 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'license_number.unique' => 'This license number is already registered to another driver.',
            'contact_number.regex' => 'Enter a valid Philippine mobile number (e.g. 09171234567).',
        ];
    }
}
