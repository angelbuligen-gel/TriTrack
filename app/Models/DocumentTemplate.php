<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Editable layout for a generated document. One row per document type so
 * the administrator can change the wording, signatory, logo and signature
 * without a redeploy. Certificates and application forms share the table.
 */
#[Fillable([
    'document_type',
    'name',
    'title',
    'statements',
    'header_text',
    'footer_text',
    'signatory_name',
    'signatory_position',
    'logo_path',
    'signature_path',
    'date_format',
    'is_active',
])]
class DocumentTemplate extends Model
{
    public const CERTIFICATE_RENEWAL = 'certificate_renewal';

    public const CERTIFICATE_TRANSFER = 'certificate_transfer';

    public const CERTIFICATE_CHANGE_MOTOR = 'certificate_change_motor';

    public const FORM_RENEWAL = 'form_renewal';

    public const FORM_TRANSFER = 'form_transfer';

    public const FORM_CHANGE_MOTOR = 'form_change_motor';

    public const TYPES = [
        self::CERTIFICATE_RENEWAL,
        self::CERTIFICATE_TRANSFER,
        self::CERTIFICATE_CHANGE_MOTOR,
        self::FORM_RENEWAL,
        self::FORM_TRANSFER,
        self::FORM_CHANGE_MOTOR,
    ];

    public const LABELS = [
        self::CERTIFICATE_RENEWAL => 'Renewal certificate',
        self::CERTIFICATE_TRANSFER => 'Transfer certificate',
        self::CERTIFICATE_CHANGE_MOTOR => 'Change motor certificate',
        self::FORM_RENEWAL => 'Renewal application form',
        self::FORM_TRANSFER => 'Transfer application form',
        self::FORM_CHANGE_MOTOR => 'Change motor application form',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public static function for(string $documentType): ?self
    {
        return static::query()
            ->where('document_type', $documentType)
            ->orderByDesc('is_active')
            ->first();
    }

    public static function certificateTypeFor(string $applicationType): string
    {
        return match ($applicationType) {
            Application::TYPE_TRANSFER => self::CERTIFICATE_TRANSFER,
            Application::TYPE_CHANGE_MOTOR => self::CERTIFICATE_CHANGE_MOTOR,
            default => self::CERTIFICATE_RENEWAL,
        };
    }

    public static function formTypeFor(string $applicationType): string
    {
        return match ($applicationType) {
            Application::TYPE_TRANSFER => self::FORM_TRANSFER,
            Application::TYPE_CHANGE_MOTOR => self::FORM_CHANGE_MOTOR,
            default => self::FORM_RENEWAL,
        };
    }

    public function category(): string
    {
        return str_starts_with($this->document_type, 'certificate_') ? 'certificate' : 'form';
    }

    public function label(): string
    {
        return self::LABELS[$this->document_type] ?? $this->name;
    }

    /**
     * Replace {{token}} placeholders in the statement block.
     *
     * @param  array<string, string|null>  $vars
     */
    public function renderStatements(array $vars): string
    {
        return (string) preg_replace_callback(
            '/\{\{\s*([a-z0-9_]+)\s*\}\}/i',
            fn (array $match) => (string) ($vars[$match[1]] ?? ''),
            (string) $this->statements,
        );
    }

    public function logoAbsolutePath(): ?string
    {
        return $this->assetPath($this->logo_path);
    }

    public function signatureAbsolutePath(): ?string
    {
        return $this->assetPath($this->signature_path);
    }

    private function assetPath(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        $disk = Storage::disk('public');

        return $disk->exists($path) ? $disk->path($path) : null;
    }

    /**
     * @return array<string, string>
     */
    public static function sampleVars(): array
    {
        return [
            'franchisee' => 'Juan dela Cruz',
            'franchise_number' => 'FR-2026-0001',
            'application_reference' => 'APP-2026-0001',
            'certificate_number' => 'CERT-RNW-2026-0001',
            'vehicle' => 'ABC 1234 · Motor No. 1234567',
            'date_issued' => now()->format('F j, Y'),
            'valid_from' => now()->format('F j, Y'),
            'valid_until' => now()->addYear()->format('F j, Y'),
            'office' => 'Business Permits and Licensing Office',
        ];
    }

    /**
     * Ships-with-the-app content for every document type.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function defaults(): array
    {
        $header = "Republic of the Philippines\nLocal Government Unit · Business Permits and Licensing Office";

        $certificateStatement = 'This certifies that {{franchisee}}, holder of Franchise No. {{franchise_number}}, '
            .'has complied with the requirements of the Local Government Unit for this {{document_type}} '
            .'under application {{application_reference}}.';

        return [
            self::CERTIFICATE_RENEWAL => [
                'name' => 'Renewal certificate',
                'title' => 'Franchise Renewal Certificate',
                'statements' => str_replace('{{document_type}}', 'renewal', $certificateStatement),
                'header_text' => $header,
                'footer_text' => 'Issued under the local franchise ordinance. Valid only while the franchise is active and all fees are paid.',
                'signatory_name' => 'Hon. Municipal Mayor',
                'signatory_position' => 'Local Chief Executive',
                'date_format' => 'F j, Y',
                'is_active' => true,
            ],
            self::CERTIFICATE_TRANSFER => [
                'name' => 'Transfer certificate',
                'title' => 'Franchise Transfer Certificate',
                'statements' => str_replace('{{document_type}}', 'transfer of franchise ownership', $certificateStatement),
                'header_text' => $header,
                'footer_text' => 'Ownership has been transferred subject to the approval of the Business Permits and Licensing Office.',
                'signatory_name' => 'Hon. Municipal Mayor',
                'signatory_position' => 'Local Chief Executive',
                'date_format' => 'F j, Y',
                'is_active' => true,
            ],
            self::CERTIFICATE_CHANGE_MOTOR => [
                'name' => 'Change motor certificate',
                'title' => 'Change Motor Certificate',
                'statements' => str_replace('{{document_type}}', 'change of motor unit', $certificateStatement),
                'header_text' => $header,
                'footer_text' => 'The replacement motor unit is recorded against the franchise named above.',
                'signatory_name' => 'Hon. Municipal Mayor',
                'signatory_position' => 'Local Chief Executive',
                'date_format' => 'F j, Y',
                'is_active' => true,
            ],
            self::FORM_RENEWAL => [
                'name' => 'Renewal application form',
                'title' => 'Franchise Renewal Application Form',
                'statements' => 'Application for the renewal of the franchise described below. Complete every field and submit the attached requirements.',
                'header_text' => $header,
                'footer_text' => 'Submit this form together with all required documents to the Business Permits and Licensing Office.',
                'signatory_name' => 'Applicant',
                'signatory_position' => 'Signature over printed name',
                'date_format' => 'F j, Y',
                'is_active' => true,
            ],
            self::FORM_TRANSFER => [
                'name' => 'Transfer application form',
                'title' => 'Franchise Transfer Application Form',
                'statements' => 'Application to transfer the franchise described below to the proposed new owner. Both parties must sign.',
                'header_text' => $header,
                'footer_text' => 'Submit this form together with the notarized deed of sale and all required documents.',
                'signatory_name' => 'Transferor',
                'signatory_position' => 'Signature over printed name',
                'date_format' => 'F j, Y',
                'is_active' => true,
            ],
            self::FORM_CHANGE_MOTOR => [
                'name' => 'Change motor application form',
                'title' => 'Change Motor Application Form',
                'statements' => 'Application to replace the motor unit currently recorded against the franchise described below.',
                'header_text' => $header,
                'footer_text' => 'Submit this form together with the registration of the replacement unit and all required documents.',
                'signatory_name' => 'Applicant',
                'signatory_position' => 'Signature over printed name',
                'date_format' => 'F j, Y',
                'is_active' => true,
            ],
        ];
    }
}
