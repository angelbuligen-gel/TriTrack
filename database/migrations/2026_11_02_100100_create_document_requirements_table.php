<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_requirements', function (Blueprint $table) {
            $table->id();
            $table->enum('application_type', ['renewal', 'transfer', 'change_motor'])->index();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->boolean('is_required')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['application_type', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_requirements');
    }
};
