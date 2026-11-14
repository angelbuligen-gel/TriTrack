<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\SystemSetting;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Official payment receipt. Staff may print any receipt; a franchisee may
 * only print receipts for their own confirmed payments.
 */
class PaymentReceiptController extends Controller
{
    public function __invoke(Request $request, Payment $payment): Response
    {
        $user = $request->user();

        $payment->loadMissing([
            'application.franchise',
            'application.franchisee',
            'assessment.items',
            'franchisee',
            'verifiedBy',
        ]);

        $isStaff = $user instanceof User && $user->hasRole(
            User::ROLE_BPLO,
            User::ROLE_TREASURY,
            User::ROLE_ADMINISTRATOR,
        );

        if (! $isStaff) {
            $ownsPayment = $payment->franchisee?->user_id === $user?->id
                || $payment->application?->franchisee?->user_id === $user?->id;

            abort_unless($ownsPayment, 403, 'You may only download your own receipts.');
        }

        abort_unless($payment->isSuccessful(), 409, 'A receipt is issued once the payment is confirmed.');

        $office = SystemSetting::query()->where('key', 'office_name')->value('value')
            ?? 'Business Permits and Licensing Office';
        $municipality = SystemSetting::query()->where('key', 'municipality_name')->value('value');

        $application = $payment->application;
        $franchisee = $payment->franchisee ?? $application?->franchisee;

        return Pdf::loadView('receipts.payment', [
            'payment' => $payment,
            'application' => $application,
            'franchise' => $application?->franchise,
            'franchisee' => $franchisee,
            'assessment' => $payment->assessment,
            'items' => $payment->assessment?->items ?? collect(),
            'office' => trim(($office ? $office.', ' : '').($municipality ?? ''), ', '),
            'generated_at' => now()->toDateTimeString(),
        ])
            ->setPaper('a5', 'portrait')
            ->download("receipt-{$payment->reference_number}.pdf");
    }
}
