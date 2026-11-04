<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('assessment_number', 30)->unique();
            $table->foreignId('assessed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assessed_at')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending')->index();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
