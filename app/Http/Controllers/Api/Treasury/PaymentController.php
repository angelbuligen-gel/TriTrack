<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyPaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\PaymentService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Payment verification queue. Treasury personnel confirm money actually
 * arrived; the online provider webhook can also confirm it.
 */
class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

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
            ->orderByRaw("FIELD(status, 'pending', 'successful', 'failed', 'cancelled', 'refunded')")
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
        $from = $request->date('from') ?? now()->startOfMonth()->toDateString();
        $to = $request->date('to') ?? now()->toDateString();

        $summaries = Payment::query()
            ->selectRaw('status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total')
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->groupBy('status')
            ->get();

        $daily = Payment::query()
            ->selectRaw('DATE(paid_at) as date, COUNT(*) as count, SUM(amount) as total')
            ->where('status', Payment::STATUS_SUCCESSFUL)
            ->whereDate('paid_at', '>=', $from)
            ->whereDate('paid_at', '<=', $to)
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $byMethod = Payment::query()
            ->selectRaw("COALESCE(method, 'unset') as method, COUNT(*) as count, SUM(amount) as total")
            ->where('status', Payment::STATUS_SUCCESSFUL)
            ->whereDate('paid_at', '>=', $from)
            ->whereDate('paid_at', '<=', $to)
            ->groupBy('method')
            ->get();

        $byType = Payment::query()
            ->join('applications', 'applications.id', '=', 'payments.application_id')
            ->selectRaw('applications.application_type as application_type, COUNT(*) as count, SUM(payments.amount) as total')
            ->where('payments.status', Payment::STATUS_SUCCESSFUL)
            ->whereDate('payments.paid_at', '>=', $from)
            ->whereDate('payments.paid_at', '<=', $to)
            ->groupBy('applications.application_type')
            ->get();

        return ApiResponse::success([
            'period' => ['from' => $from, 'to' => $to],
            'summaries' => $summaries,
            'daily' => $daily,
            'by_method' => $byMethod,
            'by_application_type' => $byType,
            'total_collected' => (float) collect($summaries)
                ->firstWhere('status', Payment::STATUS_SUCCESSFUL)?->total,
        ], 'Collections report generated successfully.');
    }
}
