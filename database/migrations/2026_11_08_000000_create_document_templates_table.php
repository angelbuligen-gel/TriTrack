<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 60)->unique();
            $table->string('name', 150);
            $table->string('title', 150)->nullable();
            $table->text('statements')->nullable();
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();
            $table->string('signatory_name', 150)->nullable();
            $table->string('signatory_position', 150)->nullable();
            $table->string('logo_path', 255)->nullable();
            $table->string('signature_path', 255)->nullable();
            $table->string('date_format', 40)->default('F j, Y');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_templates');
    }
};
