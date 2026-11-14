<?php

namespace App\Console\Commands;

use App\Models\Franchise;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Notifies franchise owners whose franchise expires within the configured
 * window. Each franchise is reminded once per window so the daily
 * schedule does not spam the same owner.
 */
class SendRenewalReminders extends Command
{
    protected $signature = 'franchises:send-renewal-reminders {--days= : Days before expiration}';

    protected $description = 'Send renewal reminders for franchises nearing expiration.';

    public function handle(NotificationService $notifications): int
    {
        $days = (int) ($this->option('days') ?: $this->configuredDays());
        $today = now()->startOfDay();

        $franchises = Franchise::query()
            ->with(['franchisee.user'])
            ->whereIn('franchise_status', [Franchise::STATUS_ACTIVE, Franchise::STATUS_FOR_RENEWAL])
            ->whereNotNull('expiration_date')
            ->whereBetween('expiration_date', [
                $today->toDateString(),
                $today->copy()->addDays($days)->toDateString(),
            ])
            ->where(function (Builder $query) use ($today) {
                $query
                    ->whereNull('renewal_reminder_sent_at')
                    ->orWhere('renewal_reminder_sent_at', '<', $today->copy()->subDays(7));
            })
            ->get();

        $sent = 0;

        foreach ($franchises as $franchise) {
            $user = User::query()->find($franchise->franchisee?->user_id);

            if ($user === null) {
                continue;
            }

            $notification = $notifications->sendEvent($user, 'renewal_reminder', [
                'franchisee' => $franchise->franchisee?->full_name,
                'franchise_number' => $franchise->franchise_number,
                'expiration_date' => $franchise->expiration_date?->format('F j, Y') ?? '',
            ]);

            // Do not stamp the franchise when notifications are switched off,
            // otherwise the reminder would never be sent once re-enabled.
            if ($notification === null) {
                continue;
            }

            $franchise->update(['renewal_reminder_sent_at' => now()]);
            $sent++;
        }

        $this->info("Renewal reminders sent: {$sent} (window: {$days} days).");

        return self::SUCCESS;
    }

    private function configuredDays(): int
    {
        $configured = SystemSetting::query()->where('key', 'renewal_reminder_days')->value('value');

        return is_numeric($configured) ? (int) $configured : 30;
    }
}
