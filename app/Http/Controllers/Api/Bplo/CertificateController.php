<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Models\Application;
use App\Models\Certificate;
use App\Services\CertificateService;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Certificate management for BPLO personnel. Certificates are issued from
 * approved applications; PDF renders happen on demand.
 */
class CertificateController extends Controller
{
    public function __construct(private readonly CertificateService $certificates) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = Certificate::query()
            ->with(['application.franchise', 'application.franchisee', 'issuedBy'])
            ->when($request->filled('type'), fn (Builder $query) => $query
                ->where('certificate_type', $request->string('type')->toString()))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('issued_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('issued_at', '<=', $request->date('to')))
            ->when($request->filled('q'), fn (Builder $query) => $query->where(function (Builder $inner) use ($request) {
                $keyword = $request->string('q')->toString();

                $inner
                    ->where('certificate_number', 'like', "%{$keyword}%")
                    ->orWhereHas('application', fn (Builder $application) => $application
                        ->where('reference_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('application.franchise', fn (Builder $franchise) => $franchise
                        ->where('franchise_number', 'like', "%{$keyword}%"))
                    ->orWhereHas('application.franchisee', fn (Builder $franchisee) => $franchisee
                        ->where('first_name', 'like', "%{$keyword}%")
                        ->orWhere('last_name', 'like', "%{$keyword}%"));
            }))
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            CertificateResource::collection($paginated),
            'Certificates retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Certificate $certificate): JsonResponse
    {
        $certificate->load(['application.franchise', 'application.franchisee', 'issuedBy']);

        return ApiResponse::success(
            new CertificateResource($certificate),
            'Certificate retrieved successfully.',
        );
    }

    public function issue(Request $request, Application $application): JsonResponse
    {
        $certificate = $this->certificates->issue($application, $request->user());

        return ApiResponse::success(
            new CertificateResource($certificate->load(['application.franchise', 'application.franchisee', 'issuedBy'])),
            'Certificate issued successfully.',
            201,
        );
    }

    public function download(Certificate $certificate): Response
    {
        $data = $this->certificates->pdfData($certificate);

        $pdf = Pdf::loadView('certificates.pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download("{$certificate->certificate_number}.pdf");
    }
}
