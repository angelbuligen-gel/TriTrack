<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('application_documents', function (Blueprint $table) {
            $table->timestamp('ml_verified_at')->nullable()->after('ml_error');
            $table->foreignId('ml_verified_by')->nullable()->after('ml_verified_at')
                ->constrained('users')->nullOnDelete();
            $table->text('ml_review_remarks')->nullable()->after('ml_verified_by');
        });
    }

    public function down(): void
    {
        Schema::table('application_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ml_verified_by');
            $table->dropColumn(['ml_verified_at', 'ml_review_remarks']);
        });
    }
};
