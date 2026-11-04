<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Exceptions\WorkflowException;
use App\Models\Application;
use App\Models\Assessment;
use App\Models\Payment;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * PayMongo Checkout Session integration. Credentials stay in the backend
 * environment; the React application only receives the checkout URL.
 */
class PayMongoGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'paymongo';
    }

    public function createCheckout(Payment $payment, Assessment $assessment, Application $application): array
    {
        $secret = (string) config('payments.paymongo.secret_key');

        if ($secret === '') {
            throw new WorkflowException('The online payment provider is not configured.', 503);
        }

        $application->loadMissing('franchise', 'franchisee');
        $frontend = rtrim((string) config('payments.frontend_url'), '/');

        $payload = [
            'data' => [
                'attributes' => [
                    'billing' => [
                        'name' => $application->franchisee?->full_name,
                        'email' => (string) config('payments.receipt_email'),
                    ],
                    'line_items' => [[
                        'currency' => 'PHP',
                        'amount' => (int) round(((float) $payment->amount) * 100),
                        'name' => Str::limit($assessment->assessment_number.' · '.$application->typeLabel(), 120, ''),
                        'quantity' => 1,
                    ]],
                    'payment_method_types' => ['gcash', 'paymaya', 'card'],
                    'description' => "TrikeTrack {$application->typeLabel()} {$application->reference_number}",
                    'reference_number' => $payment->reference_number,
                    'success_url' => "{$frontend}/app/payments?payment=success",
                    'cancel_url' => "{$frontend}/app/payments?payment=cancelled",
                ],
            ],
        ];

        try {
            $response = Http::withBasicAuth($secret, '')
                ->acceptJson()
                ->timeout(30)
                ->post('https://api.paymongo.com/v1/checkout_sessions', $payload);
        } catch (ConnectionException) {
            throw new WorkflowException('The online payment provider could not be reached. Please try again.', 502);
        }

        if (! $response->successful()) {
            throw new WorkflowException('The online payment provider rejected the checkout request.', 502);
        }

        $data = $response->json('data') ?? [];

        return [
            'checkout_url' => $data['attributes']['checkout_url'] ?? null,
            'provider_reference' => $data['id'] ?? null,
            'payload' => $data,
        ];
    }

    public function parseWebhook(Request $request): ?array
    {
        $secret = (string) config('payments.paymongo.webhook_secret');

        if ($secret === '') {
            return null;
        }

        $header = (string) $request->header('paymongo-signature');

        if (! $this->signatureIsValid($header, $request->getContent(), $secret)) {
            return null;
        }

        $event = $request->json()->all();
        $eventType = (string) ($event['data']['attributes']['type'] ?? '');
        $resource = $event['data']['attributes']['data']['attributes'] ?? [];

        $status = match (true) {
            str_contains($eventType, 'paid') => Payment::STATUS_SUCCESSFUL,
            str_contains($eventType, 'failed') => Payment::STATUS_FAILED,
            default => Payment::STATUS_PENDING,
        };

        $reference = $resource['reference_number']
            ?? $resource['metadata']['reference_number']
            ?? null;

        return [
            'reference' => $reference,
            'provider_reference' => $resource['id'] ?? ($resource['payment_intent_id'] ?? null),
            'status' => $status,
            'payload' => $event,
        ];
    }

    private function signatureIsValid(string $header, string $body, string $secret): bool
    {
        if ($header === '') {
            return false;
        }

        $parts = collect(explode(',', $header))
            ->mapWithKeys(function (string $part) {
                [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');

                return [$key => $value];
            });

        $timestamp = $parts->get('t');
        $signature = $parts->get('li') ?: $parts->get('te');

        if (! $timestamp || ! $signature) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$body, $secret);

        return hash_equals($expected, $signature);
    }
}
