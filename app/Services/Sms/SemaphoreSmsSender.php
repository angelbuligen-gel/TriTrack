<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use App\Exceptions\SmsDeliveryException;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SemaphoreSmsSender implements SmsSender
{
    public function __construct(
        private readonly ?string $apiKey,
        private readonly ?string $senderName,
        private readonly string $endpoint,
        private readonly int $timeout = 15,
    ) {}

    public function send(string $mobileNumber, string $message): void
    {
        if (blank($this->apiKey)) {
            throw SmsDeliveryException::notConfigured();
        }

        $recipient = PhoneNumber::toGatewayFormat($mobileNumber);

        if ($recipient === null) {
            throw SmsDeliveryException::rejected('The recipient mobile number is not valid.');
        }

        $payload = [
            'apikey' => $this->apiKey,
            'number' => $recipient,
            'message' => $message,
        ];

        if (filled($this->senderName)) {
            $payload['sendername'] = $this->senderName;
        }

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout($this->timeout)
                ->post($this->endpoint, $payload);
        } catch (Throwable $e) {
            Log::error('Semaphore SMS request failed', ['exception' => $e->getMessage()]);

            throw SmsDeliveryException::unreachable();
        }

        if ($response->failed()) {
            Log::error('Semaphore SMS rejected request', ['status' => $response->status()]);

            throw SmsDeliveryException::rejected();
        }

        $message0 = $response->json();
        $first = is_array($message0) ? ($message0[0] ?? null) : null;

        if (! is_array($first) || empty($first['message_id'])) {
            Log::error('Semaphore SMS returned an unexpected payload');

            throw SmsDeliveryException::rejected();
        }

        $status = strtolower((string) ($first['status'] ?? ''));

        if (in_array($status, ['failed', 'refunded'], true)) {
            Log::error('Semaphore SMS delivery failed', ['status' => $status]);

            throw SmsDeliveryException::rejected('The SMS gateway could not deliver the message. Please try again.');
        }
    }
}
