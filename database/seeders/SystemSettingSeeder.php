<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    /**
     * Editable application settings. These are read at runtime so the
     * administrator can adjust them without a redeploy.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'municipality_name', 'value' => 'Municipality of San Isidro', 'type' => 'string', 'group' => 'general', 'label' => 'Municipality name', 'description' => 'Shown on certificates and reports.'],
            ['key' => 'office_name', 'value' => 'Business Permits and Licensing Office', 'type' => 'string', 'group' => 'general', 'label' => 'Office name', 'description' => 'Issuing office for franchises and certificates.'],
            ['key' => 'certificate_signatory', 'value' => 'Maria Santos', 'type' => 'string', 'group' => 'general', 'label' => 'Certificate signatory', 'description' => 'Name printed above the BPLO signature line.'],
            ['key' => 'certificate_signatory_title', 'value' => 'BPLO Officer', 'type' => 'string', 'group' => 'general', 'label' => 'Signatory title', 'description' => 'Position of the certificate signatory.'],
            ['key' => 'franchise_expiration_month', 'value' => '12', 'type' => 'integer', 'group' => 'franchise', 'label' => 'Franchise expiration month', 'description' => 'Month (1-12) when franchises expire each year.'],
            ['key' => 'renewal_open_month', 'value' => '10', 'type' => 'integer', 'group' => 'franchise', 'label' => 'Renewal opens on month', 'description' => 'Earliest month franchisees may file a renewal.'],
            ['key' => 'payment_instructions', 'value' => 'Pay the exact assessed amount and keep the payment reference. Treasury verifies every transaction before a certificate is issued.', 'type' => 'string', 'group' => 'payments', 'label' => 'Payment instructions', 'description' => 'Shown on the franchisee payment page.'],
            ['key' => 'accepted_payment_methods', 'value' => ['online', 'gcash', 'maya', 'card', 'bank_transfer', 'cash'], 'type' => 'json', 'group' => 'payments', 'label' => 'Accepted payment methods', 'description' => 'Methods offered on the payment screen.'],
            ['key' => 'ml_extraction_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'documents', 'label' => 'Enable OCR extraction', 'description' => 'Allow BPLO to run automatic document field extraction.'],
            ['key' => 'notifications_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'notifications', 'label' => 'In-app notifications', 'description' => 'Send status updates to franchisee accounts.'],
        ];

        foreach ($settings as $setting) {
            $value = $setting['value'];

            if ($setting['type'] === 'json' && is_array($value)) {
                $value = json_encode($value);
            } elseif ($setting['type'] === 'boolean') {
                $value = $value ? '1' : '0';
            }

            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value' => (string) $value,
                    'type' => $setting['type'],
                    'group' => $setting['group'],
                    'label' => $setting['label'],
                    'description' => $setting['description'],
                ],
            );
        }
    }
}
