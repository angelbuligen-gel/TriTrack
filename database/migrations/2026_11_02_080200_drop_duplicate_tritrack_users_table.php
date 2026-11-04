<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove the abandoned duplicate account table.
     *
     * `tritrack_users` was created by 2026_10_26_061905_create_tritrack_users_table
     * but is not referenced by the User model, holds zero rows, and defines a
     * `psd` role that this system must not have. Accounts live in `users`.
     */
    public function up(): void
    {
        Schema::dropIfExists('tritrack_users');
    }

    public function down(): void
    {
        Schema::create('tritrack_users', function (Blueprint $table) {
            $table->id('user_id');
            $table->string('full_name', 150);
            $table->string('username', 50)->unique();
            $table->string('email', 150)->unique();
            $table->string('mobile_number', 20)->nullable();
            $table->string('password');
            $table->enum('role', ['franchisee', 'bplo', 'treasury', 'psd', 'administrator']);
            $table->enum('account_status', ['pending', 'active', 'suspended'])->default('pending');
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }
};
