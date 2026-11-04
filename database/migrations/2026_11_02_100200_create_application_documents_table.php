<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Append-only document history. A new upload always inserts a new
         * row; existing rows are never overwritten or deleted, so every
         * submission remains available with its original date and review.
         */
        Schema::create('application_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('requirement_code', 50);
            $table->string('document_type', 100);
            $table->string('original_name');
            $table->string('file_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('uploaded_at');
            $table->enum('review_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_remarks')->nullable();

            // Filled in by the machine learning extraction service.
            $table->enum('ml_status', ['not_processed', 'processed', 'failed'])->default('not_processed');
            $table->string('ml_document_type', 100)->nullable();
            $table->json('ml_extracted')->nullable();
            $table->decimal('ml_confidence', 5, 4)->nullable();
            $table->timestamp('ml_processed_at')->nullable();
            $table->text('ml_error')->nullable();

            $table->timestamps();

            $table->index(['application_id', 'requirement_code']);
            $table->index('review_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_documents');
    }
};
