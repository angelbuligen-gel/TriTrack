<?php

namespace App\Services;

use App\Models\Application;
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

    public function send(User $user, string $title, string $message, string $type = 'info', ?int $applicationId = null): ?UserNotification
    {
        $enabled = SystemSetting::query()->where('key', 'notifications_enabled')->value('casted_value');

        if (! (bool) $enabled) {
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
