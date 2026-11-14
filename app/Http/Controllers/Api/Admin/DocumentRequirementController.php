<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\DocumentRequirement;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Administrator checklist configuration. Each application type has its
 * own set of required documents; the franchisee upload screen and the
 * BPLO review screen both read from here.
 */
class DocumentRequirementController extends Controller
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function index(Request $request): JsonResponse
    {
        $requirements = DocumentRequirement::query()
            ->when($request->filled('application_type'), fn ($query) => $query
                ->where('application_type', $request->string('application_type')->toString()))
            ->orderBy('application_type')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (DocumentRequirement $requirement) => $this->row($requirement))
            ->values();

        return ApiResponse::success($requirements, 'Document requirements retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules($request));
        $validated['sort_order'] = $validated['sort_order'] ?? $this->nextSortOrder($validated['application_type']);

        $requirement = DocumentRequirement::create($validated);

        $this->activity->log(
            'document_requirement.created',
            "Requirement {$requirement->name} added to {$requirement->application_type}.",
            $request->user(),
            $requirement,
        );

        return ApiResponse::success($this->row($requirement), 'Requirement created successfully.', 201);
    }

    public function update(Request $request, DocumentRequirement $documentRequirement): JsonResponse
    {
        $validated = $request->validate($this->rules($request, $documentRequirement));

        $documentRequirement->update($validated);

        $this->activity->log(
            'document_requirement.updated',
            "Requirement {$documentRequirement->name} updated.",
            $request->user(),
            $documentRequirement,
        );

        return ApiResponse::success($this->row($documentRequirement), 'Requirement updated successfully.');
    }

    public function destroy(Request $request, DocumentRequirement $documentRequirement): JsonResponse
    {
        $name = $documentRequirement->name;

        $documentRequirement->delete();

        $this->activity->log(
            'document_requirement.deleted',
            "Requirement {$name} removed.",
            $request->user(),
        );

        return ApiResponse::success(null, 'Requirement removed successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(Request $request, ?DocumentRequirement $requirement = null): array
    {
        return [
            'application_type' => ['required', Rule::in(Application::TYPES)],
            'code' => [
                'required', 'string', 'max:50',
                Rule::unique('document_requirements', 'code')
                    ->where(fn ($query) => $query->where('application_type', $request->input('application_type')))
                    ->ignore($requirement?->id),
            ],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_required' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    private function nextSortOrder(string $applicationType): int
    {
        return (int) DocumentRequirement::query()
            ->where('application_type', $applicationType)
            ->max('sort_order') + 1;
    }

    /**
     * @return array<string, mixed>
     */
    private function row(DocumentRequirement $requirement): array
    {
        return [
            'id' => $requirement->id,
            'application_type' => $requirement->application_type,
            'code' => $requirement->code,
            'name' => $requirement->name,
            'description' => $requirement->description,
            'is_required' => $requirement->is_required,
            'sort_order' => $requirement->sort_order,
            'created_at' => $requirement->created_at?->toIso8601String(),
        ];
    }
}
