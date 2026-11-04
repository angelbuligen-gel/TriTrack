<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use App\Services\Payments\PaymentGatewayManager;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public webhook endpoints for payment providers. Requests are rejected
 * unless the provider signature validates.
 */
class PaymentWebhookController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly PaymentService $payments,
    ) {}

    public function handle(Request $request, string $provider): JsonResponse
    {
        $gateway = $this->gateways->driver($provider);
        $data = $gateway->parseWebhook($request);

        if ($data === null) {
            return ApiResponse::error('The webhook signature could not be verified.', [], 400);
        }

        $payment = $this->payments->applyWebhook($provider, $data);

        return ApiResponse::success(
            $payment === null ? null : ['payment_reference' => $payment->reference_number, 'status' => $payment->status],
            $payment === null ? 'Webhook received for an unknown payment.' : 'Webhook processed.',
        );
    }
}
