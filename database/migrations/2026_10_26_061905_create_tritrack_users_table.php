<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tritrack_users', function (Blueprint $table) {
            $table->id('user_id');

            $table->string('full_name', 150);
            $table->string('username', 50)->unique();
            $table->string('email', 150)->unique();
            $table->string('mobile_number', 20)->nullable();

            $table->string('password');

            $table->enum('role', [
                'franchisee',
                'bplo',
                'treasury',
                'psd',
                'administrator'
            ]);

            $table->enum('account_status', [
                'pending',
                'active',
                'suspended'
            ])->default('pending');

            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tritrack_users');
    }
};
