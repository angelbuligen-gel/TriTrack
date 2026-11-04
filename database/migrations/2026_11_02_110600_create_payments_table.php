<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('franchisee_id')->constrained()->cascadeOnDelete();
            $table->string('reference_number', 40)->unique();
            $table->string('provider', 30)->default('simulated')->index();
            $table->string('provider_reference', 120)->nullable()->index();
            $table->string('method', 40)->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->enum('status', ['pending', 'successful', 'failed', 'cancelled', 'refunded'])
                ->default('pending')->index();
            $table->text('checkout_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->index(['application_id', 'status']);
            $table->index(['franchisee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
