<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Second stage: set up the enterprise-asset side of franchise
     * management (drivers, vehicles, franchise_drivers, franchise_vehicles).
     *
     * Safety rules honoured:
     *  - No table is dropped/recreated; no existing rows are deleted.
     *  - Columns are renamed with values preserved.
     *  - UNIQUE constraints are verified before being recreated.
     */
    public function up(): void
    {
        // ----------------------------------------------------------------
        // 1. drivers: add missing location columns (sitio_street, barangay,
        //    city, province). Existing rows already carry an address;
        //    these are new location breakdown columns, so they are nullable.
        // ----------------------------------------------------------------
        if (Schema::hasTable('drivers')) {
            if (! Schema::hasColumn('drivers', 'sitio_street')) {
                Schema::table('drivers', function (Blueprint $table) {
                    $table->string('sitio_street', 100)->nullable()->after('address');
                });
            }
            if (! Schema::hasColumn('drivers', 'barangay')) {
                Schema::table('drivers', function (Blueprint $table) {
                    $table->string('barangay', 100)->nullable()->after('sitio_street');
                });
            }
            if (! Schema::hasColumn('drivers', 'city')) {
                Schema::table('drivers', function (Blueprint $table) {
                    $table->string('city', 100)->nullable()->after('barangay');
                });
            }
            if (! Schema::hasColumn('drivers', 'province')) {
                Schema::table('drivers', function (Blueprint $table) {
                    $table->string('province', 100)->nullable()->after('city');
                });
            }
        }

        // ----------------------------------------------------------------
        // 2. vehicles: rename make -> make_brand and year_model -> or_year.
        //    These rename the *values*; DISTINCT rows are preserved.
        // ----------------------------------------------------------------
        if (Schema::hasTable('vehicles')) {
            if (Schema::hasColumn('vehicles', 'make') && ! Schema::hasColumn('vehicles', 'make_brand')) {
                Schema::table('vehicles', function (Blueprint $table) {
                    $table->renameColumn('make', 'make_brand');
                });
            }
            if (Schema::hasColumn('vehicles', 'year_model') && ! Schema::hasColumn('vehicles', 'or_year')) {
                Schema::table('vehicles', function (Blueprint $table) {
                    $table->renameColumn('year_model', 'or_year');
                });
            }
        }

        // ----------------------------------------------------------------
        // 3. franchise_drivers: add assigned_date (from assigned_from) and
        //    end_date (from assigned_until) for target field parity.
        // ----------------------------------------------------------------
        if (Schema::hasTable('franchise_drivers')) {
            if (! Schema::hasColumn('franchise_drivers', 'assigned_date')) {
                Schema::table('franchise_drivers', function (Blueprint $table) {
                    $table->date('assigned_date')->nullable()->after('assigned_from');
                });
            }
            if (! Schema::hasColumn('franchise_drivers', 'end_date')) {
                Schema::table('franchise_drivers', function (Blueprint $table) {
                    $table->date('end_date')->nullable()->after('assigned_until');
                });
            }
        }

        // ----------------------------------------------------------------
        // 4. franchise_vehicles: add effective_from, effective_to,
        //    change_remarks for vehicle-history recording.
        // ----------------------------------------------------------------
        if (Schema::hasTable('franchise_vehicles')) {
            if (! Schema::hasColumn('franchise_vehicles', 'effective_from')) {
                Schema::table('franchise_vehicles', function (Blueprint $table) {
                    $table->date('effective_from')->nullable()->after('vehicle_id');
                });
            }
            if (! Schema::hasColumn('franchise_vehicles', 'effective_to')) {
                Schema::table('franchise_vehicles', function (Blueprint $table) {
                    $table->date('effective_to')->nullable()->after('effective_from');
                });
            }
            if (! Schema::hasColumn('franchise_vehicles', 'change_remarks')) {
                Schema::table('franchise_vehicles', function (Blueprint $table) {
                    $table->string('change_remarks', 255)->nullable()->after('effective_to');
                });
            }
        }
    }

    public function down(): void
    {
        // Reverse only what this stage introduced; no table drops.
        if (Schema::hasTable('drivers')) {
            $drop = ['province', 'city', 'barangay', 'sitio_street'];
            foreach ($drop as $column) {
                if (Schema::hasColumn('drivers', $column)) {
                    Schema::table('drivers', function (Blueprint $table) use ($column) {
                        $table->dropColumn($column);
                    });
                }
            }
        }

        if (Schema::hasTable('vehicles')) {
            if (Schema::hasColumn('vehicles', 'make_brand')) {
                Schema::table('vehicles', function (Blueprint $table) {
                    $table->renameColumn('make_brand', 'make');
                });
            }
            if (Schema::hasColumn('vehicles', 'or_year')) {
                Schema::table('vehicles', function (Blueprint $table) {
                    $table->renameColumn('or_year', 'year_model');
                });
            }
        }

        if (Schema::hasTable('franchise_drivers')) {
            if (Schema::hasColumn('franchise_drivers', 'end_date') || Schema::hasColumn('franchise_drivers', 'assigned_date')) {
                Schema::table('franchise_drivers', function (Blueprint $table) {
                    $table->dropColumn(['end_date', 'assigned_date']);
                });
            }
        }

        if (Schema::hasTable('franchise_vehicles')) {
            $drop = ['change_remarks', 'effective_to', 'effective_from'];
            foreach ($drop as $column) {
                if (Schema::hasColumn('franchise_vehicles', $column)) {
                    Schema::table('franchise_vehicles', function (Blueprint $table) use ($column) {
                        $table->dropColumn($column);
                    });
                }
            }
        }
    }
};
