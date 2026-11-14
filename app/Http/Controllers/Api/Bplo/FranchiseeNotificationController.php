<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Models\Franchisee;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * BPLO-initiated messages to a franchisee. BPLO may notify franchisees
 * but cannot manage administrator privileges or edit system settings.
 */
class FranchiseeNotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogger $activity,
    ) {}

    public function store(Request $request, Franchisee $franchisee): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:2000'],
            'type' => ['required', Rule::in(['info', 'success', 'warning', 'error'])],
        ]);

        $user = User::query()->find($franchisee->user_id);

        if ($user === null) {
            return ApiResponse::error(
                'This franchisee has no linked account to notify.',
                ['user_id' => ['Link a franchisee account first.']],
                422,
            );
        }

        $notification = $this->notifications->send(
            $user,
            $validated['title'],
            $validated['message'],
            $validated['type'],
        );

        if ($notification === null) {
            return ApiResponse::error(
                'In-app notifications are currently disabled in system settings.',
                [],
                409,
            );
        }

        $this->activity->log(
            'franchisee.notified',
            "Notification sent to {$franchisee->full_name}: {$validated['title']}.",
            $request->user(),
            $franchisee,
        );

        return ApiResponse::success(
            ['notification_id' => $notification->id],
            'Notification sent to the franchisee.',
            201,
        );
    }
}
