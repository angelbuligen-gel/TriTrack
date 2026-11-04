<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('or_number', 60)->nullable()->index();
            $table->string('cr_number', 60)->nullable();
            $table->string('motor_number', 80)->unique();
            $table->string('chassis_number', 80)->nullable()->unique();
            $table->string('plate_number', 30)->nullable()->unique();
            $table->string('make', 80)->nullable();
            $table->string('model', 80)->nullable();
            $table->unsignedSmallInteger('year_model')->nullable();
            $table->string('color', 40)->nullable();
            $table->enum('vehicle_status', [
                'pending',
                'active',
                'replaced',
                'retired',
                'rejected',
            ])->default('pending')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
