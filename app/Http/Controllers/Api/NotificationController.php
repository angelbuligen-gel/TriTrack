<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\UserNotification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * In-app notifications for the signed-in user.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginated = $request->user()
            ->appNotifications()
            ->when($request->boolean('unread'), fn ($query) => $query->whereNull('read_at'))
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            NotificationResource::collection($paginated),
            'Notifications retrieved successfully.',
            200,
            [
                ...$this->paginationMeta($paginated),
                'unread_count' => $request->user()->appNotifications()->whereNull('read_at')->count(),
            ],
        );
    }

    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        $this->assertOwned($request, $notification);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return ApiResponse::success(
            new NotificationResource($notification->fresh()),
            'Notification marked as read.',
        );
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()->appNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponse::success(
            ['updated' => $updated],
            'All notifications marked as read.',
        );
    }

    private function assertOwned(Request $request, UserNotification $notification): void
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403, 'You may only read your own notifications.');
        }
    }
}
