<?php

namespace App\Services;

use App\Models\Application;
use App\Models\NotificationTemplate;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserNotification;

class NotificationService
{
    /**
     * Send an in-app notification to the franchisee who owns the application.
     */
    public function notifyApplication(Application $application, string $title, string $message, string $type = 'info'): void
    {
        $application->loadMissing('franchisee');

        $user = User::query()
            ->where('id', $application->franchisee?->user_id)
            ->first();

        if ($user === null) {
            return;
        }

        $this->send($user, $title, $message, $type, $application->id);
    }

    /**
     * Send the configured notification for an event, if it is enabled.
     * Missing templates are silently skipped so a new event can never
     * break the workflow it belongs to.
     *
     * @param  array<string, string|null>  $vars
     */
    public function notifyApplicationEvent(Application $application, string $event, array $vars = []): void
    {
        $application->loadMissing(['franchisee', 'franchise']);

        $user = User::query()
            ->where('id', $application->franchisee?->user_id)
            ->first();

        if ($user === null) {
            return;
        }

        $this->sendEvent($user, $event, array_merge([
            'franchisee' => $application->franchisee?->full_name,
            'franchise_number' => $application->franchise?->franchise_number,
            'application_reference' => $application->reference_number,
            'application_type' => $application->typeLabel(),
        ], $vars), $application->id);
    }

    /**
     * Send a configured notification to any user, outside an application.
     *
     * @param  array<string, string|null>  $vars
     */
    public function sendEvent(User $user, string $event, array $vars = [], ?int $applicationId = null): ?UserNotification
    {
        $template = NotificationTemplate::for($event);

        if ($template === null || ! $template->is_enabled) {
            return null;
        }

        return $this->send(
            $user,
            NotificationTemplate::renderText($template->title, $vars),
            NotificationTemplate::renderText($template->body, $vars),
            $template->type,
            $applicationId,
        );
    }

    public function send(User $user, string $title, string $message, string $type = 'info', ?int $applicationId = null): ?UserNotification
    {
        $setting = SystemSetting::query()->where('key', 'notifications_enabled')->first();

        // Default to enabled when the setting has not been seeded yet.
        if ($setting !== null && ! (bool) $setting->castedValue()) {
            return null;
        }

        return UserNotification::create([
            'user_id' => $user->id,
            'application_id' => $applicationId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
        ]);
    }
}
