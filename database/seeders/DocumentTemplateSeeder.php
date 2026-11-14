<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DocumentTemplate::defaults() as $documentType => $values) {
            DocumentTemplate::updateOrCreate(
                ['document_type' => $documentType],
                $values,
            );
        }
    }
}
