<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Log;

/**
 * Development driver: writes the message to storage/logs/laravel.log
 * instead of sending SMS. Selected when SMS_DRIVER=log.
 */
class LogSmsSender implements SmsSender
{
    public function send(string $mobileNumber, string $message): void
    {
        Log::info('[SMS:log driver - development only] Outgoing SMS', [
            'to' => PhoneNumber::mask($mobileNumber),
            'message' => $message,
        ]);
    }
}
