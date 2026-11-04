<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use InvalidArgumentException;

class PaymentGatewayManager
{
    public function driver(?string $name = null): PaymentGateway
    {
        return match ($name ?? config('payments.default', 'simulated')) {
            'paymongo' => app(PayMongoGateway::class),
            'simulated' => app(SimulatedPaymentGateway::class),
            default => throw new InvalidArgumentException('Unsupported payment gateway.'),
        };
    }
}
