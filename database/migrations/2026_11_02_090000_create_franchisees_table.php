<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('franchisees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('first_name', 80);
            $table->string('middle_name', 80)->nullable();
            $table->string('last_name', 80)->index();
            $table->string('suffix', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->text('address');
            $table->string('barangay', 100)->nullable();
            $table->string('city_municipality', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('contact_number', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('franchisees');
    }
};
