<?php

namespace App\Services;

use App\Exceptions\WorkflowException;
use App\Models\ApplicationDocument;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Bridges Laravel to the Python FastAPI OCR service. The service never
 * receives database credentials, only the raw document bytes.
 */
class MlDocumentExtractor
{
    /**
     * Run OCR and structured field extraction for an uploaded document.
     */
    public function extract(ApplicationDocument $document): ApplicationDocument
    {
        $baseUrl = rtrim((string) config('services.ml.url'), '/');

        if ($baseUrl === '') {
            throw new WorkflowException('The document extraction service is not configured.', 503);
        }

        $disk = Storage::disk(ApplicationDocumentStorage::DISK);

        if (! $disk->exists($document->file_path)) {
            throw new WorkflowException('The document file is no longer available.', 404);
        }

        $document->update(['ml_status' => 'processing', 'ml_error' => null]);

        try {
            $response = Http::timeout((int) config('services.ml.timeout', 60))
                ->acceptJson()
                ->attach('file', $disk->get($document->file_path), $document->original_name, [
                    'Content-Type' => $document->mime_type ?: 'application/octet-stream',
                ])
                ->post("{$baseUrl}/extract-document");
        } catch (ConnectionException $exception) {
            $document->update([
                'ml_status' => 'failed',
                'ml_error' => 'The extraction service is unreachable. You may still review the document manually.',
                'ml_processed_at' => now(),
            ]);

            throw new WorkflowException('The document extraction service is unavailable. Review the document manually instead.', 503);
        }

        if (! $response->successful()) {
            $message = $response->json('detail') ?? 'The document could not be processed.';

            $document->update([
                'ml_status' => 'failed',
                'ml_error' => is_string($message) ? $message : 'The document could not be processed.',
                'ml_processed_at' => now(),
            ]);

            throw new WorkflowException(is_string($message) ? $message : 'The document could not be processed.', 422);
        }

        $data = $response->json();
        $extracted = collect($data['extracted_data'] ?? [])
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->all();

        $document->update([
            'ml_status' => 'completed',
            'ml_document_type' => $data['document_type'] ?? null,
            'ml_extracted' => $extracted,
            'ml_confidence' => $this->confidence($extracted, $data['extraction_summary'] ?? null),
            'ml_processed_at' => now(),
            'ml_error' => null,
        ]);

        return $document->fresh();
    }

    /**
     * Give the suggestion an honest percentage: the proportion of the
     * expected fields the OCR service managed to fill in.
     *
     * @param  array<string, mixed>  $extracted
     * @param  array<string, mixed>|null  $summary
     */
    private function confidence(array $extracted, ?array $summary): float
    {
        $expected = (int) (is_array($summary) ? ($summary['total_fields'] ?? 0) : 0);

        if ($expected <= 0) {
            $expected = max(count($extracted), 1);
        }

        $filled = Collection::make($extracted)
            ->filter(fn ($value) => $value !== null && trim((string) $value) !== '')
            ->count();

        return round(min(1, $filled / $expected), 2);
    }
}
