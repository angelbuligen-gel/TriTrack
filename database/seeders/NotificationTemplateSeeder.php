<?php

namespace Database\Seeders;

use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (NotificationTemplate::defaults() as $event => $values) {
            NotificationTemplate::updateOrCreate(
                ['event' => $event],
                $values + ['is_enabled' => true],
            );
        }
    }
}
