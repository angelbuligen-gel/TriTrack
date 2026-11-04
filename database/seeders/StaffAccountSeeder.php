<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class StaffAccountSeeder extends Seeder
{
    /**
     * Local development staff accounts.
     *
     * Change or remove these credentials before any real deployment.
     */
    public function run(): void
    {
        $password = 'TrikeTrack@2026';

        $accounts = [
            [
                'name' => 'System Administrator',
                'email' => 'admin@tritrack.local',
                'username' => 'admin',
                'role' => User::ROLE_ADMINISTRATOR,
            ],
            [
                'name' => 'BPLO Personnel',
                'email' => 'bplo@tritrack.local',
                'username' => 'bplo',
                'role' => User::ROLE_BPLO,
            ],
            [
                'name' => 'Treasury Personnel',
                'email' => 'treasury@tritrack.local',
                'username' => 'treasury',
                'role' => User::ROLE_TREASURY,
            ],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'username' => $account['username'],
                    'password' => $password,
                    'role' => $account['role'],
                    'account_status' => User::STATUS_ACTIVE,
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
