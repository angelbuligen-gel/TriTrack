<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Editable wording for each notification event. The administrator can
 * retitle messages and disable individual events without a redeploy.
 */
#[Fillable([
    'event',
    'name',
    'title',
    'body',
    'type',
    'is_enabled',
])]
class NotificationTemplate extends Model
{
    public const APPLICATION_SUBMITTED = 'application_submitted';

    public const APPLICATION_APPROVED = 'application_approved';

    public const APPLICATION_REJECTED = 'application_rejected';

    public const DOCUMENTS_MISSING = 'documents_missing';

    public const PAYMENT_INSTRUCTIONS = 'payment_instructions';

    public const PAYMENT_CONFIRMED = 'payment_confirmed';

    public const RENEWAL_REMINDER = 'renewal_reminder';

    public const CERTIFICATE_READY = 'certificate_ready';

    public const ACCOUNT_CREATED = 'account_created';

    public const NEW_LOGIN = 'new_login';

    public const SESSION_TERMINATED = 'session_terminated';

    public const EVENTS = [
        self::APPLICATION_SUBMITTED,
        self::APPLICATION_APPROVED,
        self::APPLICATION_REJECTED,
        self::DOCUMENTS_MISSING,
        self::PAYMENT_INSTRUCTIONS,
        self::PAYMENT_CONFIRMED,
        self::RENEWAL_REMINDER,
        self::CERTIFICATE_READY,
        self::ACCOUNT_CREATED,
        self::NEW_LOGIN,
        self::SESSION_TERMINATED,
    ];

    public const LABELS = [
        self::APPLICATION_SUBMITTED => 'Application submitted',
        self::APPLICATION_APPROVED => 'Application approved',
        self::APPLICATION_REJECTED => 'Application rejected',
        self::DOCUMENTS_MISSING => 'Missing requirements',
        self::PAYMENT_INSTRUCTIONS => 'Payment instructions',
        self::PAYMENT_CONFIRMED => 'Payment confirmed',
        self::RENEWAL_REMINDER => 'Renewal reminder',
        self::CERTIFICATE_READY => 'Certificate available',
        self::ACCOUNT_CREATED => 'Account created',
        self::NEW_LOGIN => 'New sign-in',
        self::SESSION_TERMINATED => 'Session terminated',
    ];

    public const PLACEHOLDERS = [
        '{{franchisee}}', '{{franchise_number}}', '{{application_reference}}',
        '{{application_type}}', '{{amount}}', '{{certificate_number}}',
        '{{reason}}', '{{expiration_date}}',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
        ];
    }

    public static function for(string $event): ?self
    {
        return static::query()->where('event', $event)->first();
    }

    /**
     * @param  array<string, string|null>  $vars
     */
    public static function renderText(string $text, array $vars): string
    {
        return (string) preg_replace_callback(
            '/\{\{\s*([a-z0-9_]+)\s*\}\}/i',
            fn (array $match) => (string) ($vars[$match[1]] ?? ''),
            $text,
        );
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function defaults(): array
    {
        return [
            self::APPLICATION_SUBMITTED => [
                'name' => 'Application submitted',
                'title' => 'Application received',
                'body' => 'Your {{application_type}} application {{application_reference}} for franchise {{franchise_number}} has been received and is awaiting review.',
                'type' => 'info',
            ],
            self::APPLICATION_APPROVED => [
                'name' => 'Application approved',
                'title' => 'Application approved',
                'body' => 'Your {{application_type}} application {{application_reference}} has been approved. {{reason}}',
                'type' => 'success',
            ],
            self::APPLICATION_REJECTED => [
                'name' => 'Application rejected',
                'title' => 'Application rejected',
                'body' => 'Your {{application_type}} application {{application_reference}} was rejected. Reason: {{reason}}',
                'type' => 'error',
            ],
            self::DOCUMENTS_MISSING => [
                'name' => 'Missing requirements',
                'title' => 'Requirements need attention',
                'body' => 'Some documents for application {{application_reference}} need correction or resubmission. {{reason}}',
                'type' => 'warning',
            ],
            self::PAYMENT_INSTRUCTIONS => [
                'name' => 'Payment instructions',
                'title' => 'Payment is now due',
                'body' => 'Assessment for application {{application_reference}} totals PHP {{amount}}. Present the reference to Treasury or pay online.',
                'type' => 'info',
            ],
            self::PAYMENT_CONFIRMED => [
                'name' => 'Payment confirmed',
                'title' => 'Payment confirmed',
                'body' => 'We recorded your payment of PHP {{amount}} for application {{application_reference}}.',
                'type' => 'success',
            ],
            self::RENEWAL_REMINDER => [
                'name' => 'Renewal reminder',
                'title' => 'Franchise renewal due',
                'body' => 'Franchise {{franchise_number}} expires on {{expiration_date}}. File your renewal before the deadline.',
                'type' => 'warning',
            ],
            self::CERTIFICATE_READY => [
                'name' => 'Certificate available',
                'title' => 'Certificate ready',
                'body' => 'Certificate {{certificate_number}} for application {{application_reference}} is ready for download.',
                'type' => 'success',
            ],
            self::ACCOUNT_CREATED => [
                'name' => 'Account created',
                'title' => 'Welcome to TrikeTrack',
                'body' => 'Your franchisee account for franchise {{franchise_number}} has been created and linked.',
                'type' => 'success',
            ],
            self::NEW_LOGIN => [
                'name' => 'New sign-in',
                'title' => 'New sign-in recorded',
                'body' => 'A new sign-in to your TrikeTrack account was recorded. If this was not you, contact the BPLO immediately.',
                'type' => 'info',
            ],
            self::SESSION_TERMINATED => [
                'name' => 'Session terminated',
                'title' => 'Session ended by administrator',
                'body' => 'An administrator ended one of your active sessions. {{reason}}',
                'type' => 'warning',
            ],
        ];
    }
}
