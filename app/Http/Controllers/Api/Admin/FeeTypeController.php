<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\FeeType;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Administrator fee schedule. Official amounts live in the database and
 * are read by the assessment flow, never hardcoded in the frontend.
 */
class FeeTypeController extends Controller
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function index(Request $request): JsonResponse
    {
        $fees = FeeType::query()
            ->when($request->filled('application_type'), fn ($query) => $query
                ->where('application_type', $request->string('application_type')->toString()))
            ->when($request->filled('active'), fn ($query) => $query
                ->where('is_active', $request->boolean('active')))
            ->orderBy('application_type')
            ->orderBy('name')
            ->get()
            ->map(fn (FeeType $fee) => $this->row($fee))
            ->values();

        return ApiResponse::success($fees, 'Fee types retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $fee = FeeType::create($validated);

        $this->activity->log(
            'fee_type.created',
            "Fee type {$fee->name} ({$fee->code}) created for {$fee->application_type}.",
            $request->user(),
            $fee,
        );

        return ApiResponse::success($this->row($fee), 'Fee type created successfully.', 201);
    }

    public function update(Request $request, FeeType $feeType): JsonResponse
    {
        $validated = $request->validate($this->rules($feeType));

        $feeType->update($validated);

        $this->activity->log(
            'fee_type.updated',
            "Fee type {$feeType->name} ({$feeType->code}) updated.",
            $request->user(),
            $feeType,
        );

        return ApiResponse::success($this->row($feeType), 'Fee type updated successfully.');
    }

    /**
     * Archive rather than delete: historical assessments reference the
     * fee, so the record must stay readable.
     */
    public function destroy(Request $request, FeeType $feeType): JsonResponse
    {
        $feeType->update(['is_active' => false]);

        $this->activity->log(
            'fee_type.archived',
            "Fee type {$feeType->name} ({$feeType->code}) archived.",
            $request->user(),
            $feeType,
        );

        return ApiResponse::success($this->row($feeType), 'Fee type archived successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?FeeType $fee = null): array
    {
        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('fee_types', 'code')->ignore($fee?->id)],
            'name' => ['required', 'string', 'max:150'],
            'application_type' => ['required', Rule::in(Application::TYPES)],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function row(FeeType $fee): array
    {
        return [
            'id' => $fee->id,
            'code' => $fee->code,
            'name' => $fee->name,
            'application_type' => $fee->application_type,
            'application_type_label' => match ($fee->application_type) {
                Application::TYPE_RENEWAL => 'Renewal',
                Application::TYPE_TRANSFER => 'Transfer',
                Application::TYPE_CHANGE_MOTOR => 'Change motor',
                default => ucfirst(str_replace('_', ' ', (string) $fee->application_type)),
            },
            'amount' => (float) $fee->amount,
            'description' => $fee->description,
            'is_active' => $fee->is_active,
            'created_at' => $fee->created_at?->toIso8601String(),
        ];
    }
}
