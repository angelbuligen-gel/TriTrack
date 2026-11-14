<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Administrator control over certificate and application form layouts.
 * Every generated document reads the active template, so edits apply to
 * the next document printed — previously issued files are untouched.
 */
class DocumentTemplateController extends Controller
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function index(): JsonResponse
    {
        $templates = DocumentTemplate::query()
            ->orderBy('document_type')
            ->get()
            ->map(fn (DocumentTemplate $template) => $this->row($template))
            ->values();

        return ApiResponse::success([
            'templates' => $templates,
            'placeholders' => [
                '{{franchisee}}', '{{franchise_number}}', '{{application_reference}}',
                '{{certificate_number}}', '{{vehicle}}', '{{date_issued}}',
                '{{valid_from}}', '{{valid_until}}', '{{office}}',
            ],
        ], 'Document templates retrieved successfully.');
    }

    public function update(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'title' => ['nullable', 'string', 'max:150'],
            'statements' => ['nullable', 'string'],
            'header_text' => ['nullable', 'string'],
            'footer_text' => ['nullable', 'string'],
            'signatory_name' => ['nullable', 'string', 'max:150'],
            'signatory_position' => ['nullable', 'string', 'max:150'],
            'date_format' => ['nullable', 'string', 'max:40'],
            'is_active' => ['boolean'],
        ]);

        $documentTemplate->update($validated);

        $this->activity->log(
            'document_template.updated',
            "Document template {$documentTemplate->label()} updated.",
            $request->user(),
            $documentTemplate,
        );

        return ApiResponse::success($this->row($documentTemplate), 'Template saved successfully.');
    }

    public function uploadAsset(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['logo', 'signature'])],
            'file' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        $column = $validated['type'].'_path';
        $previous = $documentTemplate->{$column};

        $path = $validated['file']->store('templates', 'public');

        if ($previous !== null && $previous !== $path) {
            Storage::disk('public')->delete($previous);
        }

        $documentTemplate->update([$column => $path]);

        $this->activity->log(
            'document_template.asset',
            "Document template {$documentTemplate->label()} {$validated['type']} replaced.",
            $request->user(),
            $documentTemplate,
        );

        return ApiResponse::success($this->row($documentTemplate), ucfirst($validated['type']).' updated successfully.');
    }

    public function restore(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $defaults = DocumentTemplate::defaults()[$documentTemplate->document_type] ?? null;

        if ($defaults === null) {
            return ApiResponse::error('This template has no default content.', [], 422);
        }

        $documentTemplate->update($defaults);

        $this->activity->log(
            'document_template.restored',
            "Document template {$documentTemplate->label()} restored to defaults.",
            $request->user(),
            $documentTemplate,
        );

        return ApiResponse::success($this->row($documentTemplate), 'Template restored to its default content.');
    }

    public function preview(DocumentTemplate $documentTemplate): Response
    {
        return Pdf::loadView('templates.preview', [
            'template' => $documentTemplate,
            'vars' => DocumentTemplate::sampleVars(),
            'generated_at' => now()->toDateTimeString(),
        ])
            ->setPaper('a4', 'portrait')
            ->stream('template-preview.pdf');
    }

    /**
     * @return array<string, mixed>
     */
    private function row(DocumentTemplate $template): array
    {
        return [
            'id' => $template->id,
            'document_type' => $template->document_type,
            'name' => $template->name,
            'label' => $template->label(),
            'category' => $template->category(),
            'title' => $template->title,
            'statements' => $template->statements,
            'header_text' => $template->header_text,
            'footer_text' => $template->footer_text,
            'signatory_name' => $template->signatory_name,
            'signatory_position' => $template->signatory_position,
            'date_format' => $template->date_format,
            'is_active' => $template->is_active,
            'has_logo' => $template->logoAbsolutePath() !== null,
            'has_signature' => $template->signatureAbsolutePath() !== null,
            'updated_at' => $template->updated_at?->toIso8601String(),
        ];
    }
}
