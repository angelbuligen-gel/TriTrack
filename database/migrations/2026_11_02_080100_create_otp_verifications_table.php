<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store one record per issued OTP. Codes are hashed, never stored
     * in plain text, and previous codes are revoked by the service.
     */
    public function up(): void
    {
        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 30)->default('phone_verification');
            $table->string('mobile_number', 20);
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(5);
            $table->dateTime('expires_at');
            $table->dateTime('last_sent_at');
            $table->dateTime('consumed_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'purpose', 'consumed_at']);
            $table->index(['mobile_number', 'purpose']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_verifications');
    }
};
