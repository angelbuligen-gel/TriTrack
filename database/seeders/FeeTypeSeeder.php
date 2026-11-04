<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\FeeType;
use Illuminate\Database\Seeder;

class FeeTypeSeeder extends Seeder
{
    /**
     * Default fee schedule. Treasury may still adjust the amount on a
     * per-assessment basis before the franchisee pays.
     */
    public function run(): void
    {
        $fees = [
            Application::TYPE_RENEWAL => [
                ['code' => 'renewal_fee', 'name' => 'Franchise Renewal Fee', 'amount' => 500.00, 'description' => 'Annual franchise renewal fee.'],
                ['code' => 'mayors_permit', 'name' => "Mayor's Permit Fee", 'amount' => 300.00, 'description' => 'Permit fee for the operation of the motorized tricycle.'],
                ['code' => 'sanitary_fee', 'name' => 'Sanitary Inspection Fee', 'amount' => 150.00, 'description' => 'Sanitary inspection of the motor unit.'],
                ['code' => 'sticker_fee', 'name' => 'Franchise Sticker Fee', 'amount' => 100.00, 'description' => 'Annual franchise sticker.'],
            ],
            Application::TYPE_TRANSFER => [
                ['code' => 'transfer_fee', 'name' => 'Franchise Transfer Fee', 'amount' => 700.00, 'description' => 'Processing of the transfer of franchise ownership.'],
                ['code' => 'transfer_processing', 'name' => 'Transfer Processing Fee', 'amount' => 300.00, 'description' => 'Document evaluation and processing.'],
                ['code' => 'certificate_fee', 'name' => 'Certificate Issuance Fee', 'amount' => 100.00, 'description' => 'Issuance of the transfer certificate.'],
            ],
            Application::TYPE_CHANGE_MOTOR => [
                ['code' => 'change_motor_fee', 'name' => 'Change Motor Fee', 'amount' => 400.00, 'description' => 'Processing of the replacement motor unit.'],
                ['code' => 'inspection_fee', 'name' => 'Motor Inspection Fee', 'amount' => 150.00, 'description' => 'Inspection of the replacement unit.'],
                ['code' => 'sticker_fee', 'name' => 'Replacement Sticker Fee', 'amount' => 100.00, 'description' => 'Replacement franchise sticker for the new unit.'],
            ],
        ];

        foreach ($fees as $type => $items) {
            foreach ($items as $item) {
                FeeType::updateOrCreate(
                    ['code' => $item['code']],
                    [
                        'name' => $item['name'],
                        'application_type' => $type,
                        'amount' => $item['amount'],
                        'description' => $item['description'],
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
