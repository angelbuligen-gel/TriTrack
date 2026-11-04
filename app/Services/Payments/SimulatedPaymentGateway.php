<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Models\Application;
use App\Models\Assessment;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Local development gateway. It creates a verifiable payment reference but
 * never marks the payment paid by itself: treasury personnel must verify
 * the transaction, exactly as with a manual bank deposit.
 */
class SimulatedPaymentGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'simulated';
    }

    public function createCheckout(Payment $payment, Assessment $assessment, Application $application): array
    {
        return [
            'checkout_url' => config('payments.simulated_checkout_url'),
            'provider_reference' => 'SIM-'.Str::upper(Str::random(10)),
            'payload' => [
                'mode' => 'treasury_verification_required',
                'amount' => $payment->amount,
                'reference' => $payment->reference_number,
            ],
        ];
    }

    public function parseWebhook(Request $request): ?array
    {
        return null;
    }
}
