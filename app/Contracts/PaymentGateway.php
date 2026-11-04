<?php

namespace App\Contracts;

use App\Models\Application;
use App\Models\Assessment;
use App\Models\Payment;
use Illuminate\Http\Request;

interface PaymentGateway
{
    public function name(): string;

    /**
     * Create a provider checkout for the payment.
     *
     * @return array{checkout_url?: string|null, provider_reference?: string|null, payload?: array<string, mixed>}
     */
    public function createCheckout(Payment $payment, Assessment $assessment, Application $application): array;

    /**
     * Validate and normalise a provider webhook. Returns null when the
     * provider does not support webhooks or the request is invalid.
     *
     * @return array{reference?: string|null, provider_reference?: string|null, status: string, payload: array<string, mixed>}|null
     */
    public function parseWebhook(Request $request): ?array;
}
