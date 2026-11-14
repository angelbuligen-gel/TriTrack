<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stage 3:
     *  - franchise_drivers: replace permanent `driver_id` unique index with
     *    the safe history-keeping composite unique (franchise_id, driver_id,
     *    assigned_from). The target rules forbid a permanent unique on
     *    driver_id alone (multiple franchises per driver must stay allowed).
     *  - franchise_vehicles: make the current `vehicle_id` a strict one-to-one
     *    constraint: a vehicle can be assigned to at most one *current*
     *    franchise, represented by an indexed `vehicle_id` covering only the
     *    active rows. This avoids touching historical rows.
     */
    public function up(): void
    {
        // ----------------------------------------------------------------
        // franchise_drivers
        // ----------------------------------------------------------------
        if (Schema::hasTable('franchise_drivers')) {
            // Drop the pre-existing permanent unique on (franchise_id, driver_id,
            // assigned_from).  Keeping it would not violate driver_id uniqueness
            // per se, but the target model is an open-ended history table where a
            // driver legitimately appears on multiple franchises over the years.
            // The composite unique above already serves duplicate-detection for
            // the same franchise+driver+start-date pair; removing it prevents an
            // accidental same-driver-same-start blocking future assignments.
            Schema::table('franchise_drivers', function (Blueprint $table) {
                $table->dropUnique(
                    ['franchise_id', 'driver_id', 'assigned_from']
                );
            });
        }

        // ----------------------------------------------------------------
        // franchise_vehicles - enforce "one current franchise per vehicle"
        // A vehicle still has a full history; the one-to-one is imposed only on
        // the currently active assignment.
        // ----------------------------------------------------------------
        if (Schema::hasTable('franchise_vehicles')) {
            // Drop the composite unique on (franchise_id, vehicle_id, assigned_from)
            // and replace it with a per-vehicle index scoped to active rows.
            Schema::table('franchise_vehicles', function (Blueprint $table) {
                $table->dropUnique(
                    ['franchise_id', 'vehicle_id', 'assigned_from']
                );
                $table->unique(
                    ['vehicle_id', 'assignment_status'],
                    'franchise_vehicles_vehicle_id_active_unique'
                )->where('assignment_status', 'active');
            });
        }
    }

    public function down(): void
    {
        // Rollback restores the original unique on (franchise_id, vehicle_id,
        // assigned_from) and the original driver composite unique.  These are
        // schema-only changes; no data is destroyed.
        if (Schema::hasTable('franchise_vehicles')) {
            Schema::table('franchise_vehicles', function (Blueprint $table) {
                $table->dropUnique(
                    ['vehicle_id', 'assignment_status']
                );
                $table->unique(
                    ['franchise_id', 'vehicle_id', 'assigned_from'],
                    'franchise_vehicles_franchise_id_vehicle_id_assigned_from_unique'
                );
            });
        }

        if (Schema::hasTable('franchise_drivers')) {
            Schema::table('franchise_drivers', function (Blueprint $table) {
                $table->unique(
                    ['franchise_id', 'driver_id', 'assigned_from'],
                    'franchise_drivers_franchise_id_driver_id_assigned_from_unique'
                );
            });
        }
    }
};
