<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\DocumentRequirement;
use Illuminate\Database\Seeder;

class DocumentRequirementSeeder extends Seeder
{
    /**
     * The document checklist franchisees must satisfy for each type of
     * application. BPLO may adjust the checklist through the database.
     */
    public function run(): void
    {
        $requirements = [
            Application::TYPE_RENEWAL => [
                ['code' => 'renewal_form', 'name' => 'Franchise Renewal Application Form', 'required' => true, 'description' => 'Signed and completed renewal application form.'],
                ['code' => 'previous_franchise', 'name' => 'Previous Franchise Certificate', 'required' => true, 'description' => 'Copy of the expiring franchise certificate.'],
                ['code' => 'or_payment', 'name' => 'Official Receipt of Prior Payment', 'required' => true, 'description' => 'Proof of payment for the previous franchise period.'],
                ['code' => 'vehicle_registration', 'name' => 'Motor Vehicle Registration (CR/OR)', 'required' => true, 'description' => 'Current LTO certificate of registration and official receipt.'],
                ['code' => 'drivers_license', 'name' => "Driver's License", 'required' => true, 'description' => 'Valid professional license of the assigned driver.'],
                ['code' => 'barangay_clearance', 'name' => 'Barangay Clearance', 'required' => false, 'description' => 'Optional supporting clearance from the barangay.'],
            ],
            Application::TYPE_TRANSFER => [
                ['code' => 'transfer_form', 'name' => 'Franchise Transfer Application Form', 'required' => true, 'description' => 'Signed request to transfer the franchise to a new owner.'],
                ['code' => 'franchise_certificate', 'name' => 'Current Franchise Certificate', 'required' => true, 'description' => 'Copy of the franchise being transferred.'],
                ['code' => 'deed_of_sale', 'name' => 'Deed of Sale or Transfer', 'required' => true, 'description' => 'Notarized document transferring the unit and franchise.'],
                ['code' => 'new_owner_id', 'name' => 'New Owner Valid ID', 'required' => true, 'description' => 'Government-issued identification of the proposed new owner.'],
            ],
            Application::TYPE_CHANGE_MOTOR => [
                ['code' => 'change_motor_form', 'name' => 'Change Motor Application Form', 'required' => true, 'description' => 'Signed request to replace the registered motor unit.'],
                ['code' => 'franchise_certificate', 'name' => 'Current Franchise Certificate', 'required' => true, 'description' => 'Copy of the franchise affected by the change.'],
                ['code' => 'new_vehicle_registration', 'name' => 'New Motor Registration (CR/OR)', 'required' => true, 'description' => 'LTO registration of the proposed replacement unit.'],
                ['code' => 'deed_of_sale_motor', 'name' => 'Deed of Sale for the New Motor', 'required' => true, 'description' => 'Ownership document for the replacement unit.'],
            ],
        ];

        foreach ($requirements as $type => $checklist) {
            foreach ($checklist as $index => $item) {
                DocumentRequirement::updateOrCreate(
                    ['application_type' => $type, 'code' => $item['code']],
                    [
                        'name' => $item['name'],
                        'description' => $item['description'],
                        'is_required' => $item['required'],
                        'sort_order' => $index + 1,
                    ],
                );
            }
        }
    }
}
