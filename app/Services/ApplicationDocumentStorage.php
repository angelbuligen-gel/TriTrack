<?php

namespace App\Services;

use App\Exceptions\WorkflowException;
use App\Models\Application;
use App\Models\ApplicationDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores uploaded application documents on the private disk and hands the
 * metadata to the workflow so a database row is always created per upload.
 */
class ApplicationDocumentStorage
{
    public const DISK = 'local';

    public const MAX_KILOBYTES = 10240;

    public const MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    public function __construct(private readonly ApplicationWorkflow $workflow) {}

    public function store(
        Application $application,
        string $requirementCode,
        UploadedFile $file,
        User $user,
    ): ApplicationDocument {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $filename = Str::uuid()->toString().'.'.$extension;

        $path = $file->storeAs('applications/'.$application->id, $filename, self::DISK);

        if ($path === false) {
            throw new WorkflowException('The uploaded document could not be stored. Please try again.', 500);
        }

        try {
            return $this->workflow->submitDocument($application, $requirementCode, [
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                'file_size' => $file->getSize(),
            ], $user);
        } catch (\Throwable $exception) {
            // Do not leave an orphaned file behind when the record fails.
            Storage::disk(self::DISK)->delete($path);

            throw $exception;
        }
    }

    public function exists(ApplicationDocument $document): bool
    {
        return Storage::disk(self::DISK)->exists($document->file_path);
    }
}
