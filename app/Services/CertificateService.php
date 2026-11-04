<?php

namespace App\Services;

use App\Exceptions\WorkflowException;
use App\Models\Application;
use App\Models\Certificate;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class CertificateService
{
    public function __construct(
        private readonly ActivityLogger $activity,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Issue the certificate for an approved application. Issuing is
     * idempotent: an application has at most one certificate.
     */
    public function issue(Application $application, User $user): Certificate
    {
        if ($application->status !== Application::STATUS_APPROVED && $application->status !== Application::STATUS_COMPLETED) {
            throw WorkflowException::conflict('Only approved applications can be issued a certificate.');
        }

        $existing = $application->certificate()->first();

        if ($existing !== null) {
            return $existing;
        }

        $assessment = $application->assessment()->first();

        if ($assessment !== null && ! $assessment->isPaid()) {
            throw WorkflowException::conflict('The assessment must be paid before a certificate can be issued.');
        }

        $application->loadMissing(['franchise', 'franchisee', 'vehicleChange']);

        return DB::transaction(function () use ($application, $user) {
            $certificate = Certificate::create([
                'application_id' => $application->id,
                'certificate_number' => $this->nextNumber($application->application_type),
                'certificate_type' => $application->application_type,
                'issued_by' => $user->id,
                'issued_at' => now(),
                'metadata' => $this->metadata($application),
            ]);

            $this->activity->log(
                'certificate.issued',
                "Certificate {$certificate->certificate_number} issued for {$application->reference_number}.",
                $user,
                $certificate,
            );

            $this->notifications->notifyApplication(
                $application,
                'Certificate ready',
                "Certificate {$certificate->certificate_number} for {$application->reference_number} is ready for download.",
                'success',
            );

            return $certificate->fresh(['application.franchisee', 'application.franchise', 'issuedBy']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function pdfData(Certificate $certificate): array
    {
        $certificate->loadMissing(['application.franchise', 'application.franchisee', 'application.vehicleChange', 'issuedBy']);

        $application = $certificate->application;
        $franchise = $application->franchise;
        $franchisee = $application->franchisee;
        $change = $application->vehicleChange;

        return [
            'certificate' => $certificate,
            'application' => $application,
            'franchise' => $franchise,
            'franchisee' => $franchisee,
            'vehicle' => [
                'plate_number' => $change?->proposed_plate_number ?? $franchise?->activeVehicle?->plate_number,
                'motor_number' => $change?->proposed_motor_number ?? $franchise?->activeVehicle?->motor_number,
                'chassis_number' => $change?->proposed_chassis_number ?? $franchise?->activeVehicle?->chassis_number,
                'make' => $change?->make ?? $franchise?->activeVehicle?->make,
                'model' => $change?->model ?? $franchise?->activeVehicle?->model,
                'year_model' => $change?->year_model ?? $franchise?->activeVehicle?->year_model,
            ],
            'valid_from' => CarbonImmutable::parse($certificate->issued_at)->toDateString(),
            'valid_until' => $this->validUntil($application),
            'issued_by' => $certificate->issuedBy?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function metadata(Application $application): array
    {
        return [
            'franchise_number' => $application->franchise?->franchise_number,
            'franchisee_name' => $application->franchisee?->full_name,
            'valid_from' => now()->toDateString(),
            'valid_until' => $this->validUntil($application),
            'coverage_year' => $application->coverage_year,
            'approved_by' => $application->decided_by,
            'approved_at' => $application->decided_at?->toIso8601String(),
        ];
    }

    private function validUntil(Application $application): ?string
    {
        $expiration = $application->franchise?->expiration_date;

        if ($expiration !== null) {
            return CarbonImmutable::parse($expiration)->toDateString();
        }

        if ($application->coverage_year !== null) {
            return CarbonImmutable::create($application->coverage_year, 12, 31)->toDateString();
        }

        return null;
    }

    private function nextNumber(string $type): string
    {
        $year = now()->year;
        $code = match ($type) {
            Application::TYPE_RENEWAL => 'RNW',
            Application::TYPE_TRANSFER => 'TRF',
            Application::TYPE_CHANGE_MOTOR => 'CHM',
            default => 'FRN',
        };

        $latest = Certificate::query()
            ->where('certificate_number', 'like', "CERT-{$code}-{$year}-%")
            ->orderByDesc('id')
            ->value('certificate_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, -4)) + 1;

        return sprintf('CERT-%s-%d-%04d', $code, $year, $sequence);
    }
}
