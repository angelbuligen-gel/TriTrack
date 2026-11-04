<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Franchise;
use App\Models\Franchisee;
use App\Models\FranchiseDriver;
use App\Models\FranchiseVehicle;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class FranchiseRecordsSeeder extends Seeder
{
    /**
     * Sample franchise records used while building and reviewing the
     * system. Replace with real data before any deployment.
     */
    public function run(): void
    {
        $owner = User::updateOrCreate(
            ['email' => 'marites.santos@example.com'],
            [
                'name' => 'Marites Santos',
                'mobile_number' => '+639175550111',
                'password' => 'Passw0rd123',
                'role' => User::ROLE_FRANCHISEE,
                'account_status' => User::STATUS_ACTIVE,
                'email_verified_at' => now(),
                'phone_verified_at' => now(),
            ],
        );

        $profile = Franchisee::updateOrCreate(
            ['user_id' => $owner->id],
            [
                'first_name' => 'Marites',
                'middle_name' => 'Diaz',
                'last_name' => 'Santos',
                'birth_date' => '1985-04-12',
                'address' => 'Blk 7 Lot 12 Sampaguita Street',
                'barangay' => 'Ilaya',
                'city_municipality' => 'Calapan City',
                'province' => 'Oriental Mindoro',
                'contact_number' => '+639175550111',
            ],
        );

        // A second franchisee with no linked account, for the BPLO
        // "link account" workflow.
        $unlinked = Franchisee::updateOrCreate(
            ['user_id' => null, 'last_name' => 'Reyes', 'first_name' => 'Roberto'],
            [
                'first_name' => 'Roberto',
                'middle_name' => 'Cruz',
                'last_name' => 'Reyes',
                'birth_date' => '1978-11-03',
                'address' => 'Purok 4, Magbulo Street',
                'barangay' => 'Lagundi',
                'city_municipality' => 'Naujan',
                'province' => 'Oriental Mindoro',
                'contact_number' => '+639185550222',
            ],
        );

        $franchise = Franchise::updateOrCreate(
            ['franchise_number' => 'OM-2026-0001'],
            [
                'franchisee_id' => $profile->id,
                'date_issued' => '2024-06-15',
                'expiration_date' => '2027-06-14',
                'franchise_status' => Franchise::STATUS_ACTIVE,
                'remarks' => 'Tricycle-for-hire franchise unit 0001.',
            ],
        );

        $secondFranchise = Franchise::updateOrCreate(
            ['franchise_number' => 'OM-2024-0117'],
            [
                'franchisee_id' => $unlinked->id,
                'date_issued' => '2023-02-01',
                'expiration_date' => '2026-01-31',
                'franchise_status' => Franchise::STATUS_FOR_RENEWAL,
                'remarks' => 'Renewal due.',
            ],
        );

        $drivers = [
            [
                'first_name' => 'Ernesto',
                'last_name' => 'Dela Rosa',
                'license_number' => 'N01-12-345678',
                'license_expiry' => now()->addYear()->toDateString(),
                'contact_number' => '+639175550333',
                'address' => 'Sitio Masagana, Calapan City',
            ],
            [
                'first_name' => 'Jun',
                'middle_name' => 'B',
                'last_name' => 'Marquez',
                'license_number' => 'N01-09-876543',
                'license_expiry' => now()->addMonths(6)->toDateString(),
                'contact_number' => '+639175550444',
                'address' => 'Purok 2, Naujan',
            ],
        ];

        foreach ($drivers as $data) {
            $driver = Driver::firstOrCreate(
                ['license_number' => $data['license_number']],
                $data,
            );

            FranchiseDriver::firstOrCreate(
                [
                    'franchise_id' => $franchise->id,
                    'driver_id' => $driver->id,
                    'assigned_from' => '2024-06-15',
                ],
                ['is_primary' => true, 'assignment_status' => 'active'],
            );
        }

        $vehicles = [
            [
                'or_number' => 'OR-2024-556677',
                'cr_number' => 'CR-2024-889900',
                'motor_number' => 'KYMCO-125-0001',
                'plate_number' => 'TKE-001',
                'make' => 'Kymco',
                'model' => 'K125',
                'year_model' => 2023,
                'color' => 'Blue',
                'vehicle_status' => Vehicle::STATUS_ACTIVE,
            ],
            [
                'or_number' => 'OR-2024-556688',
                'cr_number' => 'CR-2024-889911',
                'motor_number' => 'HONDA-110-0002',
                'plate_number' => 'TKE-002',
                'make' => 'Honda',
                'model' => 'Wave 110',
                'year_model' => 2024,
                'color' => 'Red',
                'vehicle_status' => Vehicle::STATUS_ACTIVE,
            ],
        ];

        foreach ($vehicles as $data) {
            $vehicle = Vehicle::firstOrCreate(['motor_number' => $data['motor_number']], $data);

            FranchiseVehicle::firstOrCreate(
                [
                    'franchise_id' => $franchise->id,
                    'vehicle_id' => $vehicle->id,
                    'assigned_from' => '2024-06-15',
                ],
                ['assignment_status' => 'active'],
            );
        }

        FranchiseVehicle::firstOrCreate(
            [
                'franchise_id' => $secondFranchise->id,
                'vehicle_id' => Vehicle::firstOrCreate(
                    ['motor_number' => 'YAMAHA-150-0117'],
                    [
                        'or_number' => 'OR-2023-441122',
                        'cr_number' => 'CR-2023-441133',
                        'plate_number' => 'TKE-117',
                        'make' => 'Yamaha',
                        'model' => 'Mio 125',
                        'year_model' => 2022,
                        'color' => 'Black',
                        'vehicle_status' => Vehicle::STATUS_ACTIVE,
                    ],
                )->id,
                'assigned_from' => '2023-02-01',
            ],
            ['assignment_status' => 'active'],
        );
    }
}
