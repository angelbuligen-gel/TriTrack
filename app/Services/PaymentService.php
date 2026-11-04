<?php

namespace App\Services;

use App\Exceptions\WorkflowException;
use App\Models\Application;
use App\Models\Assessment;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\User;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly NotificationService $notifications,
        private readonly ActivityLogger $activity,
    ) {}

    /**
     * Start an online payment for an assessment. A second pending payment
     * for the same assessment is not created.
     */
    public function initiate(Assessment $assessment, User $user, ?string $method = null): Payment
    {
        if ($assessment->isPaid()) {
            throw WorkflowException::conflict('This assessment has already been paid.');
        }

        if ($assessment->status !== Assessment::STATUS_PENDING) {
            throw WorkflowException::conflict('This assessment is not open for payment.');
        }

        $existing = Payment::query()
            ->where('assessment_id', $assessment->id)
            ->where('status', Payment::STATUS_PENDING)
            ->first();

        if ($existing !== null) {
            return $existing->load(['assessment.items', 'application']);
        }

        $application = $assessment->application;

        return DB::transaction(function () use ($assessment, $application, $user, $method) {
            $payment = Payment::create([
                'assessment_id' => $assessment->id,
                'application_id' => $application->id,
                'franchisee_id' => $application->franchisee_id,
                'reference_number' => $this->nextReference(),
                'provider' => config('payments.default', 'simulated'),
                'method' => $method,
                'amount' => $assessment->total_amount,
                'currency' => 'PHP',
                'status' => Payment::STATUS_PENDING,
            ]);

            $this->event($payment, 'created', $payment->status, 'system', ['method' => $method]);

            try {
                $checkout = $this->gateways->driver()->createCheckout($payment, $assessment, $application);
            } catch (\Throwable $exception) {
                $payment->update([
                    'status' => Payment::STATUS_FAILED,
                    'failure_reason' => $exception->getMessage(),
                ]);
                $this->event($payment, 'checkout_failed', Payment::STATUS_FAILED, 'system', [
                    'message' => $exception->getMessage(),
                ]);

                throw $exception;
            }

            $payment->update([
                'provider_reference' => $checkout['provider_reference'] ?? null,
                'checkout_url' => $checkout['checkout_url'] ?? null,
            ]);

            $this->event($payment, 'checkout_created', $payment->status, 'system', $checkout['payload'] ?? []);

            $this->activity->log('payment.initiated', "Payment {$payment->reference_number} initiated for {$application->reference_number}.", $user, $payment);

            return $payment->fresh()->load(['assessment.items', 'application.franchise', 'application.franchisee']);
        });
    }

    /**
     * Treasury verification of a payment transaction.
     */
    public function verify(Payment $payment, User $user, string $status, ?string $providerReference = null, ?string $remarks = null): Payment
    {
        if ($payment->isSuccessful()) {
            throw WorkflowException::conflict('This payment has already been verified as successful.');
        }

        if (! in_array($status, [Payment::STATUS_SUCCESSFUL, Payment::STATUS_FAILED, Payment::STATUS_CANCELLED], true)) {
            throw WorkflowException::invalid('Select a valid payment status.');
        }

        if ($providerReference !== null && $providerReference !== '') {
            $payment->provider_reference = $providerReference;
        }

        if ($status === Payment::STATUS_SUCCESSFUL) {
            $this->markSuccessful($payment, $user, 'treasury', $remarks);
        } else {
            DB::transaction(function () use ($payment, $status, $remarks, $user) {
                $payment->update([
                    'status' => $status,
                    'failure_reason' => $remarks,
                    'verified_by' => $user->id,
                    'verified_at' => now(),
                ]);

                if ($status === Payment::STATUS_FAILED) {
                    $payment->assessment?->update(['status' => Assessment::STATUS_PENDING]);
                }

                $this->event($payment, 'verified_'.$status, $status, 'treasury', ['remarks' => $remarks]);
            });
        }

        $this->activity->log(
            'payment.verified',
            "Payment {$payment->reference_number} marked {$status}.",
            $user,
            $payment,
        );

        $this->notifications->notifyApplication(
            $payment->application,
            $status === Payment::STATUS_SUCCESSFUL ? 'Payment confirmed' : 'Payment not confirmed',
            "Payment {$payment->reference_number} was marked {$status}.".($remarks ? " Remarks: {$remarks}" : ''),
            $status === Payment::STATUS_SUCCESSFUL ? 'success' : 'warning',
        );

        return $payment->fresh()->load(['assessment.items', 'application', 'verifiedBy']);
    }

    /**
     * Apply a provider webhook. The provider response is authenticated by
     * the gateway before this method is called.
     *
     * @param  array{reference?: string|null, provider_reference?: string|null, status: string, payload: array<string, mixed>}  $data
     */
    public function applyWebhook(string $provider, array $data): ?Payment
    {
        $payment = Payment::query()
            ->when($data['reference'] ?? null, fn ($query, $reference) => $query
                ->where('reference_number', $reference))
            ->when(! ($data['reference'] ?? null) && ($data['provider_reference'] ?? null), fn ($query) => $query
                ->where('provider_reference', $data['provider_reference']))
            ->first();

        if ($payment === null) {
            return null;
        }

        if ($payment->isSuccessful()) {
            $this->event($payment, 'webhook_duplicate', $payment->status, $provider, $data['payload']);

            return $payment;
        }

        if ($data['status'] === Payment::STATUS_SUCCESSFUL) {
            $this->markSuccessful($payment, null, $provider, null, $data['payload']);
        } elseif (in_array($data['status'], [Payment::STATUS_FAILED, Payment::STATUS_CANCELLED], true)) {
            $payment->update([
                'status' => $data['status'],
                'failure_reason' => 'Provider reported '.$data['status'].'.',
            ]);
            $this->event($payment, 'webhook_'.$data['status'], $data['status'], $provider, $data['payload']);
        }

        return $payment->fresh();
    }

    private function markSuccessful(Payment $payment, ?User $verifier, string $source, ?string $remarks = null, array $payload = []): void
    {
        DB::transaction(function () use ($payment, $verifier, $source, $remarks, $payload) {
            $payment->update([
                'status' => Payment::STATUS_SUCCESSFUL,
                'paid_at' => $payment->paid_at ?? now(),
                'verified_by' => $verifier?->id,
                'verified_at' => now(),
                'failure_reason' => null,
            ]);

            $payment->assessment?->update([
                'status' => Assessment::STATUS_PAID,
                'remarks' => $remarks ?? $payment->assessment->remarks,
            ]);

            $this->event($payment, 'payment_successful', Payment::STATUS_SUCCESSFUL, $source, $payload);
        });
    }

    private function event(Payment $payment, string $event, ?string $status, string $source, array $payload = []): PaymentEvent
    {
        return PaymentEvent::create([
            'payment_id' => $payment->id,
            'event' => $event,
            'status' => $status,
            'source' => $source,
            'payload' => $payload ?: null,
        ]);
    }

    private function nextReference(): string
    {
        $year = now()->year;

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $latest = Payment::query()
                ->where('reference_number', 'like', "PAY-{$year}-%")
                ->orderByDesc('id')
                ->value('reference_number');

            $sequence = $latest === null ? 1 : ((int) substr($latest, -5)) + 1;
            $reference = sprintf('PAY-%d-%05d', $year, $sequence);

            if (! Payment::query()->where('reference_number', $reference)->exists()) {
                return $reference;
            }
        }

        return sprintf('PAY-%d-%05d', $year, random_int(10000, 99999));
    }
}
