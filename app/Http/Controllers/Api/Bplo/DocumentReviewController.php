<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Concerns\StreamsApplicationDocuments;
use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmExtractionRequest;
use App\Http\Requests\ReviewDocumentRequest;
use App\Http\Resources\ApplicationDocumentResource;
use App\Models\ApplicationDocument;
use App\Services\ActivityLogger;
use App\Services\ApplicationWorkflow;
use App\Services\MlDocumentExtractor;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cross-application document queue for BPLO personnel.
 */
class DocumentReviewController extends Controller
{
    use StreamsApplicationDocuments;

    public function __construct(
        private readonly ApplicationWorkflow $workflow,
        private readonly MlDocumentExtractor $extractor,
        private readonly ActivityLogger $activity,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = ApplicationDocument::query()
            ->with([
                'application.franchise',
                'application.franchisee',
                'uploadedBy',
                'reviewedBy',
            ])
            ->when($request->filled('review_status'), fn (Builder $query) => $query
                ->where('review_status', $request->string('review_status')->toString()))
            ->when($request->filled('application_id'), fn (Builder $query) => $query
                ->where('application_id', $request->integer('application_id')))
            ->when($request->filled('type'), fn (Builder $query) => $query
                ->whereHas('application', fn (Builder $inner) => $inner
                    ->where('application_type', $request->string('type')->toString())))
            ->when($request->filled('q'), fn (Builder $query) => $query->where(function (Builder $inner) use ($request) {
                $keyword = $request->string('q')->toString();

                $inner
                    ->where('original_name', 'like', "%{$keyword}%")
                    ->orWhere('document_type', 'like', "%{$keyword}%")
                    ->orWhereHas('application', fn (Builder $application) => $application
                        ->where('reference_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('application.franchise', fn (Builder $franchise) => $franchise
                        ->where('franchise_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('application.franchisee', fn (Builder $franchisee) => $franchisee
                        ->where('first_name', 'like', "%{$keyword}%")
                        ->orWhere('last_name', 'like', "%{$keyword}%"));
            }))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('uploaded_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('uploaded_at', '<=', $request->date('to')))
            // Pending reviews first, then rejected, then approved.
            ->orderByRaw("FIELD(review_status, 'pending', 'rejected', 'approved')")
            ->orderByDesc('uploaded_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        $documents = collect($paginated->items())->map(fn (ApplicationDocument $document) => [
            'document' => new ApplicationDocumentResource($document),
            'application' => [
                'id' => $document->application?->id,
                'reference_number' => $document->application?->reference_number,
                'application_type' => $document->application?->application_type,
                'type_label' => $document->application?->typeLabel(),
                'status' => $document->application?->status,
                'status_label' => $document->application?->statusLabel(),
            ],
            'franchise' => [
                'id' => $document->application?->franchise?->id,
                'franchise_number' => $document->application?->franchise?->franchise_number,
            ],
            'franchisee' => [
                'id' => $document->application?->franchisee?->id,
                'full_name' => $document->application?->franchisee?->full_name,
            ],
        ]);

        return ApiResponse::success(
            $documents,
            'Submitted documents retrieved successfully.',
            200,
            [
                ...$this->paginationMeta($paginated),
                'pending_total' => ApplicationDocument::query()
                    ->where('review_status', ApplicationDocument::REVIEW_PENDING)
                    ->count(),
            ],
        );
    }

    public function review(ReviewDocumentRequest $request, ApplicationDocument $document): JsonResponse
    {
        $document = $this->workflow->reviewDocument(
            $document,
            $request->user(),
            $request->string('review_status')->toString(),
            $request->string('review_remarks')->toString() ?: null,
        );

        return ApiResponse::success(
            new ApplicationDocumentResource($document->load(['application', 'uploadedBy', 'reviewedBy'])),
            'Document review saved.',
        );
    }

    /**
     * Run the external OCR service and store its suggestions. The result
     * is never auto-accepted; BPLO must confirm or edit it.
     */
    public function extract(Request $request, ApplicationDocument $document): JsonResponse
    {
        $document = $this->extractor->extract($document);

        $this->activity->log(
            'document.ml_extracted',
            "OCR extraction completed for {$document->original_name}.",
            $request->user(),
            $document,
        );

        return ApiResponse::success(
            new ApplicationDocumentResource($document->load(['application', 'uploadedBy', 'reviewedBy', 'mlVerifiedBy'])),
            'Document extraction completed. Review the suggested values before accepting them.',
        );
    }

    /**
     * Accept or correct the extracted values. Confirmation is attributed
     * to the staff member, not to the OCR service.
     */
    public function confirmExtraction(ConfirmExtractionRequest $request, ApplicationDocument $document): JsonResponse
    {
        $document->update([
            'ml_extracted' => $request->input('extracted_data'),
            'ml_verified_at' => now(),
            'ml_verified_by' => $request->user()->id,
            'ml_review_remarks' => $request->string('remarks')->toString() ?: null,
            'ml_status' => 'verified',
        ]);

        $this->activity->log(
            'document.ml_verified',
            "OCR values confirmed for {$document->original_name}.",
            $request->user(),
            $document,
        );

        return ApiResponse::success(
            new ApplicationDocumentResource($document->fresh()->load(['application', 'uploadedBy', 'reviewedBy', 'mlVerifiedBy'])),
            'Extracted values verified successfully.',
        );
    }

    public function file(Request $request, ApplicationDocument $document): Response
    {
        return $this->documentResponse($document, $request);
    }
}
