<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MySQL/MariaDB gives the first TIMESTAMP column an implicit
     * "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" when
     * explicit_defaults_for_timestamp is off. That silently rewrote
     * `uploaded_at` whenever a document was reviewed, destroying the
     * original submission time. DATETIME has no such behaviour.
     */
    public function up(): void
    {
        Schema::table('application_documents', function (Blueprint $table) {
            $table->dateTime('uploaded_at')->change();
            $table->dateTime('reviewed_at')->nullable()->change();
            $table->dateTime('ml_processed_at')->nullable()->change();
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->dateTime('submitted_at')->nullable()->change();
            $table->dateTime('under_review_at')->nullable()->change();
            $table->dateTime('decided_at')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('application_documents', function (Blueprint $table) {
            $table->timestamp('uploaded_at')->change();
            $table->timestamp('reviewed_at')->nullable()->change();
            $table->timestamp('ml_processed_at')->nullable()->change();
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->change();
            $table->timestamp('under_review_at')->nullable()->change();
            $table->timestamp('decided_at')->nullable()->change();
        });
    }
};
