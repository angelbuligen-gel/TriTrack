<?php

namespace App\Services;

use App\Models\Application;
use App\Models\DocumentRequirement;
use App\Models\DocumentTemplate;
use App\Models\SystemSetting;

/**
 * Assembles everything an application form needs: the application, its
 * franchise and vehicle, the proposal details for transfers and motor
 * changes, the configured checklist, and the active form template.
 */
class ApplicationFormService
{
    /**
     * @return array<string, mixed>
     */
    public function pdfData(Application $application): array
    {
        $application->loadMissing([
            'franchise.activeVehicle',
            'franchisee',
            'transferDetail',
            'vehicleChange.existingVehicle',
            'decidedBy',
        ]);

        $template = DocumentTemplate::for(DocumentTemplate::formTypeFor($application->application_type));
        $franchise = $application->franchise;
        $franchisee = $application->franchisee;

        $vehicle = $application->vehicleChange?->existingVehicle ?? $franchise?->activeVehicle;

        $vehicleLabel = $vehicle === null
            ? '—'
            : trim(implode(' · ', array_filter([
                $vehicle->plate_number,
                $vehicle->motor_number ? 'Motor No. '.$vehicle->motor_number : null,
                $vehicle->chassis_number ? 'Chassis No. '.$vehicle->chassis_number : null,
            ])));

        return [
            'application' => $application,
            'franchise' => $franchise,
            'franchisee' => $franchisee,
            'vehicle' => $vehicle,
            'vehicle_label' => $vehicleLabel,
            'template' => $template,
            'requirements' => DocumentRequirement::query()->forType($application->application_type)->get(),
            'office' => $this->officeName(),
            'statementVars' => [
                'franchisee' => $franchisee?->full_name,
                'franchise_number' => $franchise?->franchise_number,
                'application_reference' => $application->reference_number,
                'certificate_number' => '—',
                'vehicle' => $vehicleLabel,
                'date_issued' => now()->format($template?->date_format ?: 'F j, Y'),
                'valid_from' => now()->format($template?->date_format ?: 'F j, Y'),
                'valid_until' => $franchise?->expiration_date?->format($template?->date_format ?: 'F j, Y') ?? '—',
                'office' => $this->officeName(),
            ],
            'generated_at' => now()->toDateTimeString(),
        ];
    }

    private function officeName(): string
    {
        $office = SystemSetting::query()->where('key', 'office_name')->value('value');
        $municipality = SystemSetting::query()->where('key', 'municipality_name')->value('value');

        return trim(($office ? $office.', ' : '').($municipality ?? ''), ', ') ?: config('app.name');
    }
}
