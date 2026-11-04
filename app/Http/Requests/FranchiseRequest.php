<?php

namespace App\Http\Requests;

use App\Models\Franchise;
use Illuminate\Foundation\Http\FormRequest;

class FranchiseRequest extends FormRequest
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
            'franchisee_id' => [$required, 'integer', 'exists:franchisees,id'],
            'franchise_number' => [$required, 'string', 'max:50', 'unique:franchises,franchise_number'],
            'date_issued' => [$optional, 'nullable', 'date'],
            'expiration_date' => [
                $optional,
                'nullable',
                'date',
                'after_or_equal:date_issued',
            ],
            'franchise_status' => ['sometimes', 'string', 'in:'.implode(',', Franchise::STATUSES)],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'franchise_number.unique' => 'This franchise number is already in use.',
            'expiration_date.after_or_equal' => 'The expiration date cannot be earlier than the issue date.',
        ];
    }
}
