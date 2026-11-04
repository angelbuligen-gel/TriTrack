<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Extend the existing users table with TrikeTrack account fields.
     *
     * Inspected before writing: the table already has id, name, email,
     * email_verified_at, password, remember_token and timestamps.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->unique()->after('name');
            $table->string('mobile_number', 20)->nullable()->unique()->after('email');
            $table->enum('role', [
                'franchisee',
                'bplo',
                'treasury',
                'administrator',
            ])->default('franchisee')->after('mobile_number')->index();
            $table->enum('account_status', [
                'pending',
                'active',
                'suspended',
                'rejected',
            ])->default('pending')->after('role')->index();
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropUnique(['mobile_number']);
            $table->dropIndex(['role']);
            $table->dropIndex(['account_status']);
            $table->dropColumn([
                'username',
                'mobile_number',
                'role',
                'account_status',
                'phone_verified_at',
            ]);
        });
    }
};
