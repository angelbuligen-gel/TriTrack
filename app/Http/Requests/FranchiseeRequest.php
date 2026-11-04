<?php

namespace App\Http\Requests;

use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class FranchiseeRequest extends FormRequest
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
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'first_name' => [$required, 'string', 'max:80'],
            'middle_name' => [$optional, 'nullable', 'string', 'max:80'],
            'last_name' => [$required, 'string', 'max:80'],
            'suffix' => [$optional, 'nullable', 'string', 'max:20'],
            'birth_date' => [$optional, 'nullable', 'date'],
            'address' => [$required, 'string', 'max:500'],
            'barangay' => [$optional, 'nullable', 'string', 'max:100'],
            'city_municipality' => [$optional, 'nullable', 'string', 'max:100'],
            'province' => [$optional, 'nullable', 'string', 'max:100'],
            'contact_number' => [$required, 'string', 'regex:'.PhoneNumber::PATTERN],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Enter a valid Philippine mobile number (e.g. 09171234567).',
        ];
    }
}
