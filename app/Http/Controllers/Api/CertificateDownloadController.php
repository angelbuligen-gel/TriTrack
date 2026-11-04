<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Services\CertificateService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shared certificate PDF endpoint. Franchisees may download only their own
 * certificates; staff roles may download any issued certificate.
 */
class CertificateDownloadController extends Controller
{
    public function __invoke(Request $request, Certificate $certificate, CertificateService $certificates): Response
    {
        $user = $request->user();

        if ($user->isFranchisee()) {
            $certificate->loadMissing('application.franchisee');

            if ($certificate->application?->franchisee?->user_id !== $user->id) {
                abort(403, 'You may only download your own certificates.');
            }
        } elseif (! $user->hasRole('bplo', 'treasury', 'administrator')) {
            abort(403, 'You are not allowed to download certificates.');
        }

        $pdf = Pdf::loadView('certificates.pdf', $certificates->pdfData($certificate))
            ->setPaper('a4', 'portrait');

        return $pdf->download("{$certificate->certificate_number}.pdf");
    }
}
