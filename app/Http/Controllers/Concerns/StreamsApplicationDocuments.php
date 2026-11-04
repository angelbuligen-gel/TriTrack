<?php

namespace App\Http\Controllers\Concerns;

use App\Models\ApplicationDocument;
use App\Services\ApplicationDocumentStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

trait StreamsApplicationDocuments
{
    /**
     * Stream a stored document inline for previews or as a download.
     * Files live on the private disk and are never served directly.
     */
    protected function documentResponse(ApplicationDocument $document, Request $request): Response
    {
        $disk = Storage::disk(ApplicationDocumentStorage::DISK);

        if (! $disk->exists($document->file_path)) {
            abort(404, 'The stored document could not be found.');
        }

        return $disk->response(
            $document->file_path,
            $document->original_name,
            [
                'Content-Type' => $document->mime_type ?: 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, max-age=0, must-revalidate',
            ],
            $request->boolean('download') ? 'attachment' : 'inline',
        );
    }
}
