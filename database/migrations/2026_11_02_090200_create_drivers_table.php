<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80);
            $table->string('middle_name', 80)->nullable();
            $table->string('last_name', 80)->index();
            $table->string('suffix', 20)->nullable();
            $table->string('license_number', 60)->nullable()->unique();
            $table->date('license_expiry')->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
    }
};
