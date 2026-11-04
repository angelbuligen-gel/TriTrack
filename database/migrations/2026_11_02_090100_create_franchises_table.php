<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('franchises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('franchisee_id')->constrained()->cascadeOnDelete();
            $table->string('franchise_number', 50)->unique();
            $table->date('date_issued')->nullable();
            $table->date('expiration_date')->nullable();
            $table->enum('franchise_status', [
                'active',
                'for_renewal',
                'expired',
                'suspended',
                'cancelled',
                'transferred',
            ])->default('active')->index();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('franchises');
    }
};
