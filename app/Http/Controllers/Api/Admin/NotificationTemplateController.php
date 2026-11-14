<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationTemplate;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Administrator control over notification wording and per-event switches.
 */
class NotificationTemplateController extends Controller
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function index(): JsonResponse
    {
        $templates = NotificationTemplate::query()
            ->orderBy('event')
            ->get()
            ->map(fn (NotificationTemplate $template) => $this->row($template))
            ->values();

        return ApiResponse::success([
            'templates' => $templates,
            'events' => NotificationTemplate::LABELS,
            'placeholders' => NotificationTemplate::PLACEHOLDERS,
        ], 'Notification templates retrieved successfully.');
    }

    public function update(Request $request, NotificationTemplate $notificationTemplate): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:2000'],
            'type' => ['required', 'string', 'in:info,success,warning,error'],
            'is_enabled' => ['boolean'],
        ]);

        $notificationTemplate->update($validated);

        $this->activity->log(
            'notification_template.updated',
            "Notification template {$notificationTemplate->name} updated.",
            $request->user(),
            $notificationTemplate,
        );

        return ApiResponse::success($this->row($notificationTemplate), 'Notification template saved successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function row(NotificationTemplate $template): array
    {
        return [
            'id' => $template->id,
            'event' => $template->event,
            'name' => $template->name,
            'label' => NotificationTemplate::LABELS[$template->event] ?? $template->name,
            'title' => $template->title,
            'body' => $template->body,
            'type' => $template->type,
            'is_enabled' => $template->is_enabled,
            'updated_at' => $template->updated_at?->toIso8601String(),
        ];
    }
}
