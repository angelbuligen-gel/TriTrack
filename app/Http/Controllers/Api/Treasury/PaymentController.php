<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyPaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\SystemSetting;
use App\Services\PaymentService;
use App\Services\ReportExporter;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Payment verification queue. Treasury personnel confirm money actually
 * arrived; the online provider webhook can also confirm it.
 *
 * The collections report is built in PHP rather than with SQL date
 * functions so it behaves identically on MySQL and SQLite. Every report
 * carries a full per-transaction breakdown, not just grand totals.
 */
class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
        private readonly ReportExporter $exporter,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = Payment::query()
            ->with([
                'application.franchise',
                'application.franchisee',
                'assessment.items',
                'franchisee',
                'verifiedBy',
            ])
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('status', $request->string('status')->toString()))
            ->when($request->filled('method'), fn (Builder $query) => $query
                ->where('method', $request->string('method')->toString()))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('created_at', '<=', $request->date('to')))
            ->when($request->filled('q'), fn (Builder $query) => $query->where(function (Builder $inner) use ($request) {
                $keyword = $request->string('q')->toString();

                $inner
                    ->where('reference_number', 'like', "%{$keyword}%")
                    ->orWhere('provider_reference', 'like', "%{$keyword}%")
                    ->orWhereHas('application', fn (Builder $application) => $application
                        ->where('reference_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('franchisee', fn (Builder $franchisee) => $franchisee
                        ->where('first_name', 'like', "%{$keyword}%")
                        ->orWhere('last_name', 'like', "%{$keyword}%"));
            }))
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 WHEN status = 'successful' THEN 1 WHEN status = 'failed' THEN 2 WHEN status = 'cancelled' THEN 3 ELSE 4 END")
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            PaymentResource::collection($paginated),
            'Payments retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Payment $payment): JsonResponse
    {
        $payment->load([
            'application.franchise',
            'application.franchisee',
            'application.transferDetail',
            'application.vehicleChange.existingVehicle',
            'assessment.items.feeType',
            'franchisee',
            'verifiedBy',
            'events',
        ]);

        return ApiResponse::success(
            new PaymentResource($payment),
            'Payment retrieved successfully.',
        );
    }

    public function verify(VerifyPaymentRequest $request, Payment $payment): JsonResponse
    {
        $payment = $this->payments->verify(
            $payment,
            $request->user(),
            $request->string('status')->toString(),
            $request->string('provider_reference')->toString() ?: null,
            $request->string('remarks')->toString() ?: null,
        );

        return ApiResponse::success(
            new PaymentResource($payment->load(['application.franchise', 'application.franchisee', 'assessment.items', 'events'])),
            'Payment verification saved.',
        );
    }

    public function report(Request $request): JsonResponse
    {
        return ApiResponse::success(
            $this->reportData($request),
            'Collections report generated successfully.',
        );
    }

    public function reportPdf(Request $request): Response
    {
        $data = $this->reportData($request);

        return $this->exporter->pdf(
            'reports.collections',
            $data + [
                'office' => $this->officeName(),
                'generated_at' => now()->toDateTimeString(),
            ],
            'collections-'.$data['period']['from'].'-to-'.$data['period']['to'].'.pdf',
        );
    }

    public function reportExcel(Request $request): Response
    {
        $data = $this->reportData($request);
        $table = $this->exportTable($data);

        return $this->exporter->excel(
            'TrikeTrack Payment Collection Report',
            $table['headers'],
            $table['rows'],
            $table['money'],
            $this->exportSummary($data),
            'collections-'.$data['period']['from'].'-to-'.$data['period']['to'].'.xls',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function reportData(Request $request): array
    {
        $from = $request->filled('from') ? $request->date('from') : now()->startOfMonth();
        $to = $request->filled('to') ? $request->date('to') : now();

        $query = Payment::query()
            ->with([
                'application.franchise',
                'application.franchisee',
                'assessment.items',
                'franchisee',
                'verifiedBy',
            ])
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('method')) {
            $query->where('method', $request->string('method')->toString());
        }

        if ($request->filled('application_type')) {
            $type = $request->string('application_type')->toString();
            $query->whereHas('application', fn (Builder $application) => $application
                ->where('application_type', $type));
        }

        if ($request->filled('franchise_number')) {
            $number = $request->string('franchise_number')->toString();
            $query->whereHas('application.franchise', fn (Builder $franchise) => $franchise
                ->where('franchise_number', 'like', "%{$number}%"));
        }

        if ($request->filled('franchisee')) {
            $name = $request->string('franchisee')->toString();
            $query->whereHas('franchisee', function (Builder $franchisee) use ($name) {
                $franchisee
                    ->where('first_name', 'like', "%{$name}%")
                    ->orWhere('last_name', 'like', "%{$name}%");
            });
        }

        if ($request->filled('q')) {
            $keyword = $request->string('q')->toString();
            $query->where(function (Builder $inner) use ($keyword) {
                $inner
                    ->where('reference_number', 'like', "%{$keyword}%")
                    ->orWhere('provider_reference', 'like', "%{$keyword}%");
            });
        }

        $transactions = $query
            ->orderByDesc('created_at')
            ->limit(5000)
            ->get()
            ->map(fn (Payment $payment) => $this->transactionRow($payment))
            ->all();

        $successful = array_values(array_filter(
            $transactions,
            fn (array $row) => $row['status'] === Payment::STATUS_SUCCESSFUL,
        ));

        $pending = array_values(array_filter(
            $transactions,
            fn (array $row) => $row['status'] === Payment::STATUS_PENDING,
        ));

        $failed = array_values(array_filter(
            $transactions,
            fn (array $row) => in_array($row['status'], [Payment::STATUS_FAILED, Payment::STATUS_CANCELLED, Payment::STATUS_REFUNDED], true),
        ));

        $cash = array_values(array_filter($successful, fn (array $row) => $row['method'] === 'cash'));
        $qr = array_values(array_filter($successful, fn (array $row) => $row['method'] !== 'cash'));

        $totals = [
            'transactions' => count($transactions),
            'cash_transactions' => count($cash),
            'qr_transactions' => count($qr),
            'verified_transactions' => count($successful),
            'pending_transactions' => count($pending),
            'failed_transactions' => count($failed),
            'cash_total' => $this->sum($cash),
            'qr_total' => $this->sum($qr),
            'collected_total' => $this->sum($successful),
            'pending_total' => $this->sum($pending),
        ];

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'filters' => [
                'status' => $request->input('status'),
                'method' => $request->input('method'),
                'application_type' => $request->input('application_type'),
                'franchise_number' => $request->input('franchise_number'),
                'franchisee' => $request->input('franchisee'),
                'q' => $request->input('q'),
            ],
            'transactions' => $transactions,
            'totals' => $totals,
            'total_collected' => $totals['collected_total'],
            'summaries' => $this->groupTotals($transactions, 'status'),
            'by_method' => $this->groupSuccessful($successful, fn (array $row) => $row['method'] ?: 'online', 'method'),
            'by_application_type' => $this->groupSuccessful($successful, fn (array $row) => $row['application_type'] ?: 'unknown', 'application_type'),
            'daily' => $this->daily($successful),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transactionRow(Payment $payment): array
    {
        $application = $payment->application;
        $franchise = $application?->franchise;
        $franchisee = $payment->franchisee ?? $application?->franchisee;
        $assessment = $payment->assessment;
        $items = $assessment?->items ?? collect();

        $feeItems = $items
            ->map(fn ($item) => ['description' => $item->description, 'amount' => (float) $item->amount])
            ->all();

        $violationItems = $items->filter(
            fn ($item) => str_contains(strtolower((string) $item->description), 'violation'),
        );

        $violationTotal = (float) $violationItems->sum('amount');
        $regularTotal = (float) $items->sum('amount') - $violationTotal;

        return [
            'transaction_number' => $payment->reference_number,
            'receipt_number' => $payment->reference_number,
            'paid_at' => ($payment->paid_at ?? $payment->created_at)?->toDateTimeString(),
            'franchise_number' => $franchise?->franchise_number,
            'franchisee_name' => $franchisee?->full_name,
            'application_reference' => $application?->reference_number,
            'application_type' => $application?->application_type,
            'application_type_label' => $application?->typeLabel(),
            'assessment_number' => $assessment?->assessment_number,
            'regular_fee' => round(max($regularTotal, 0), 2),
            'other_fees' => 0.0,
            'violation_fee' => round($violationTotal, 2),
            'violation_description' => $violationItems->pluck('description')->implode('; ') ?: null,
            'total_amount_due' => (float) ($assessment?->total_amount ?? $payment->amount),
            'amount_paid' => (float) $payment->amount,
            'method' => $payment->method,
            'payment_reference' => $payment->provider_reference,
            'status' => $payment->status,
            'verified_by' => $payment->verifiedBy?->name,
            'fee_items' => $feeItems,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function groupTotals(array $rows, string $key): array
    {
        $groups = [];

        foreach ($rows as $row) {
            $value = (string) $row[$key];

            $groups[$value] = $groups[$value] ?? ['status' => $value, 'count' => 0, 'total' => 0.0];
            $groups[$value]['count']++;
            $groups[$value]['total'] += (float) $row['amount_paid'];
        }

        return array_values($groups);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function groupSuccessful(array $rows, callable $key, string $label): array
    {
        $groups = [];

        foreach ($rows as $row) {
            $value = (string) $key($row);

            $groups[$value] = $groups[$value] ?? [$label => $value, 'count' => 0, 'total' => 0.0];
            $groups[$value]['count']++;
            $groups[$value]['total'] += (float) $row['amount_paid'];
        }

        return array_values($groups);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function daily(array $rows): array
    {
        $groups = [];

        foreach ($rows as $row) {
            $date = substr((string) $row['paid_at'], 0, 10);

            $groups[$date] = $groups[$date] ?? ['date' => $date, 'count' => 0, 'total' => 0.0];
            $groups[$date]['count']++;
            $groups[$date]['total'] += (float) $row['amount_paid'];
        }

        ksort($groups);

        return array_values($groups);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function sum(array $rows): float
    {
        return round(array_sum(array_map(fn (array $row) => (float) $row['amount_paid'], $rows)), 2);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{headers: array<int, string>, rows: array<int, array<int, mixed>>, money: array<int, int>}
     */
    private function exportTable(array $data): array
    {
        $headers = [
            'Date / time', 'Transaction', 'Franchise', 'Franchisee', 'Application type',
            'Assessment', 'Regular fee', 'Other fees', 'Violation fee', 'Total due',
            'Amount paid', 'Method', 'Reference', 'Status', 'Verified by', 'Receipt', 'Fee breakdown',
        ];

        $rows = array_map(fn (array $row) => [
            $row['paid_at'],
            $row['transaction_number'],
            $row['franchise_number'],
            $row['franchisee_name'],
            $row['application_type_label'],
            $row['assessment_number'],
            $row['regular_fee'],
            $row['other_fees'],
            $row['violation_fee'],
            $row['total_amount_due'],
            $row['amount_paid'],
            $row['method'] ?: 'online',
            $row['payment_reference'],
            $row['status'],
            $row['verified_by'],
            $row['receipt_number'],
            collect($row['fee_items'])->map(fn ($item) => $item['description'].' ('.$item['amount'].')')->implode('; '),
        ], $data['transactions']);

        return ['headers' => $headers, 'rows' => $rows, 'money' => [6, 7, 8, 9, 10]];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, array{0: string, 1: mixed}>
     */
    private function exportSummary(array $data): array
    {
        $totals = $data['totals'];

        return [
            ['Total transactions', $totals['transactions']],
            ['Cash transactions', $totals['cash_transactions']],
            ['QR / online transactions', $totals['qr_transactions']],
            ['Verified transactions', $totals['verified_transactions']],
            ['Pending transactions', $totals['pending_transactions']],
            ['Total cash collections', $totals['cash_total']],
            ['Total QR collections', $totals['qr_total']],
            ['Total collected', $totals['collected_total']],
            ['Total pending', $totals['pending_total']],
        ];
    }

    private function officeName(): string
    {
        $office = SystemSetting::query()->where('key', 'office_name')->value('value');
        $municipality = SystemSetting::query()->where('key', 'municipality_name')->value('value');

        return trim(($office ? $office.', ' : '').($municipality ?? ''), ', ') ?: config('app.name');
    }
}
