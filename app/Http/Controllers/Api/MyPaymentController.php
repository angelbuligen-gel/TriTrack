<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\WorkflowException;
use App\Http\Controllers\Controller;
use App\Http\Requests\InitiatePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Assessment;
use App\Models\Franchisee;
use App\Models\Payment;
use App\Services\PaymentService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Franchisee payments. A franchisee may only view their own transactions
 * and start a checkout for their own pending assessment.
 */
class MyPaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function index(Request $request): JsonResponse
    {
        $franchisee = $this->franchisee($request);

        if ($franchisee === null) {
            return ApiResponse::success([], 'No payments are linked to your account yet.');
        }

        $paginated = Payment::query()
            ->with(['application.franchise', 'application.franchisee', 'assessment.items'])
            ->where('franchisee_id', $franchisee->id)
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('status', $request->string('status')->toString()))
            ->when($request->filled('application_id'), fn (Builder $query) => $query
                ->where('application_id', $request->integer('application_id')))
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            PaymentResource::collection($paginated),
            'Your payments were retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {
        $franchisee = $this->franchisee($request);

        if ($franchisee === null || $payment->franchisee_id !== $franchisee->id) {
            abort(403, 'You may only view your own payments.');
        }

        $payment->load([
            'application.franchise',
            'application.franchisee',
            'assessment.items.feeType',
            'assessment.payments',
            'events',
            'verifiedBy',
        ]);

        return ApiResponse::success(
            new PaymentResource($payment),
            'Payment retrieved successfully.',
        );
    }

    public function initiate(InitiatePaymentRequest $request): JsonResponse
    {
        $franchisee = $this->franchisee($request);

        if ($franchisee === null) {
            throw WorkflowException::forbidden('No franchisee record is linked to your account yet.');
        }

        $assessment = Assessment::query()
            ->with('application')
            ->where('id', $request->integer('assessment_id'))
            ->whereHas('application', fn (Builder $query) => $query
                ->where('franchisee_id', $franchisee->id))
            ->first();

        if ($assessment === null) {
            throw WorkflowException::forbidden('You may only pay assessments for your own applications.');
        }

        $payment = $this->payments->initiate(
            $assessment,
            $request->user(),
            $request->string('method')->toString() ?: null,
        );

        return ApiResponse::success(
            new PaymentResource($payment->load([
                'application.franchise',
                'application.franchisee',
                'assessment.items.feeType',
            ])),
            $payment->checkout_url
                ? 'Checkout created successfully. Redirecting to the payment provider.'
                : 'Payment reference created. Present the reference to treasury for confirmation.',
            201,
        );
    }

    private function franchisee(Request $request): ?Franchisee
    {
        return Franchisee::query()->where('user_id', $request->user()->id)->first();
    }
}
