<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_vehicle_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('existing_vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();

            $table->string('proposed_motor_number', 80)->index();
            $table->string('proposed_chassis_number', 80)->nullable();
            $table->string('proposed_plate_number', 30)->nullable();
            $table->string('proposed_or_number', 60)->nullable();
            $table->string('proposed_cr_number', 60)->nullable();
            $table->string('make', 80)->nullable();
            $table->string('model', 80)->nullable();
            $table->unsignedSmallInteger('year_model')->nullable();
            $table->string('color', 40)->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_vehicle_changes');
    }
};
