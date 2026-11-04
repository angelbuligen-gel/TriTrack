<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 30)->unique();
            $table->foreignId('franchise_id')->constrained()->cascadeOnDelete();
            $table->foreignId('franchisee_id')->constrained()->cascadeOnDelete();
            $table->enum('application_type', ['renewal', 'transfer', 'change_motor'])->index();
            $table->enum('status', [
                'submitted',
                'under_review',
                'documents_pending',
                'approved',
                'rejected',
                'cancelled',
                'completed',
            ])->default('submitted')->index();

            // Renewal-specific context, captured when the application is filed.
            $table->unsignedSmallInteger('coverage_year')->nullable();
            $table->date('previous_expiration_date')->nullable();

            $table->text('franchisee_remarks')->nullable();
            $table->text('staff_remarks')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('under_review_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['application_type', 'status']);
            $table->index(['franchise_id', 'application_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
