<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('franchise_drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('franchise_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->date('assigned_from');
            $table->date('assigned_until')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->enum('assignment_status', ['active', 'ended'])->default('active');
            $table->timestamps();

            $table->unique(['franchise_id', 'driver_id', 'assigned_from']);
            $table->index(['driver_id', 'assignment_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('franchise_drivers');
    }
};
