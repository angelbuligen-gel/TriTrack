<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use App\Services\DatabaseBackupService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Administrator backup, restore and system health endpoints. Every
 * mutation is written to the activity log.
 */
class BackupController extends Controller
{
    public function __construct(
        private readonly DatabaseBackupService $backups,
        private readonly ActivityLogger $activity,
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success([
            'backups' => $this->backups->list(),
            'health' => $this->backups->health(),
        ], 'Backups retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $backup = $this->backups->create();
        } catch (RuntimeException $exception) {
            return ApiResponse::error($exception->getMessage(), [], 422);
        }

        $this->activity->log(
            'backup.created',
            "Database backup {$backup['name']} created ({$backup['size_human']}).",
            $request->user(),
        );

        return ApiResponse::success($backup, 'Backup created successfully.', 201);
    }

    public function restore(Request $request, string $backup): JsonResponse
    {
        $validated = $request->validate([
            'confirm' => ['required', 'string', 'in:RESTORE'],
        ]);

        try {
            $restored = $this->backups->restore($backup);
        } catch (RuntimeException $exception) {
            return ApiResponse::error($exception->getMessage(), [], 422);
        }

        $this->activity->log(
            'backup.restored',
            "Database restored from {$restored['name']}.",
            $request->user(),
        );

        return ApiResponse::success($restored, 'Database restored from the selected backup.');
    }

    public function download(string $backup): BinaryFileResponse
    {
        return response()->download($this->backups->path($backup));
    }

    public function destroy(Request $request, string $backup): JsonResponse
    {
        try {
            $this->backups->delete($backup);
        } catch (RuntimeException $exception) {
            return ApiResponse::error($exception->getMessage(), [], 422);
        }

        $this->activity->log('backup.deleted', "Database backup {$backup} deleted.", $request->user());

        return ApiResponse::success(null, 'Backup deleted successfully.');
    }
}
