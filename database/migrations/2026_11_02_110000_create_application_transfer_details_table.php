<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_transfer_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->cascadeOnDelete();

            $table->string('new_owner_first_name', 80);
            $table->string('new_owner_middle_name', 80)->nullable();
            $table->string('new_owner_last_name', 80)->index();
            $table->string('new_owner_suffix', 20)->nullable();
            $table->string('new_owner_contact_number', 20)->index();
            $table->string('new_owner_email', 255)->nullable();
            $table->text('new_owner_address');
            $table->string('new_owner_barangay', 100)->nullable();
            $table->string('new_owner_city_municipality', 100)->nullable();
            $table->string('new_owner_province', 100)->nullable();
            $table->string('relationship_to_owner', 100)->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_transfer_details');
    }
};
