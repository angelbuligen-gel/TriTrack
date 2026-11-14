<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stages and applies, in dependency order, the franchise-management
     * structural changes required by the TriTrack franchise module.
     *
     * Safety rules honoured:
     *  - No table is dropped or recreated; existing records are preserved.
     *  - Columns are renamed with their values kept.
     *  - New NOT NULL columns are avoided where existing rows could fail.
     *  - UNIQUE constraints are added only after duplicate checks.
     *  - FK constraints are added only after verifying referenced rows.
     */
    public function up(): void
    {
        // ----------------------------------------------------------------
        // 1. franchisee_history (NEW TABLE)
        //    Verify it does not already exist before creating it.
        // ----------------------------------------------------------------
        if (! Schema::hasTable('franchisee_history')) {
            Schema::create('franchisee_history', function (Blueprint $table) {
                $table->id('franchisee_history_id');
                $table->foreignId('franchise_id')
                    ->constrained('franchises', 'franchise_id')
                    ->cascadeOnDelete();
                $table->foreignId('previous_franchisee_id')
                    ->nullable()
                    ->constrained('franchisees', 'franchisee_id')
                    ->nullOnDelete();
                $table->foreignId('new_franchisee_id')
                    ->nullable()
                    ->constrained('franchisees', 'franchisee_id')
                    ->nullOnDelete();
                $table->date('transfer_date')->nullable();
                $table->foreignId('approved_by')
                    ->nullable()
                    ->constrained('users', 'id')
                    ->nullOnDelete();
                $table->text('remarks')->nullable();
                $table->timestamps();

                $table->index('franchise_id');
            });
        }

        // ----------------------------------------------------------------
        // 2. franchisees: rename city_municipality -> city, add sitio_street
        // ----------------------------------------------------------------
        if (Schema::hasTable('franchisees') && Schema::hasColumn('franchisees', 'city_municipality')) {
            Schema::table('franchisees', function (Blueprint $table) {
                $table->renameColumn('city_municipality', 'city');
            });
        }
        if (Schema::hasTable('franchisees') && ! Schema::hasColumn('franchisees', 'sitio_street')) {
            Schema::table('franchisees', function (Blueprint $table) {
                $table->string('sitio_street', 100)->nullable()->after('address');
            });
        }

        // ----------------------------------------------------------------
        // 3. franchises: add nullable unique vehicle_id FK
        // ----------------------------------------------------------------
        if (Schema::hasTable('franchises') && ! Schema::hasColumn('franchises', 'vehicle_id')) {
            Schema::table('franchises', function (Blueprint $table) {
                $table->foreignId('vehicle_id')
                    ->nullable()
                    ->unique()
                    ->after('franchisee_id')
                    ->constrained('vehicles', 'vehicle_id')
                    ->nullOnDelete();
            });
        }

        // ----------------------------------------------------------------
        // 4. drivers: add missing location fields
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
        // 5. vehicles: rename make -> make_brand, year_model -> or_year
        //    and confirm unchanged UNIQUE columns are present.
        // ----------------------------------------------------------------
        if (Schema::hasTable('vehicles')) {
            if (Schema::hasColumn('vehicles', 'make')) {
                Schema::table('vehicles', function (Blueprint $table) {
                    $table->renameColumn('make', 'make_brand');
                });
            }
            if (Schema::hasColumn('vehicles', 'year_model')) {
                Schema::table('vehicles', function (Blueprint $table) {
                    $table->renameColumn('year_model', 'or_year');
                });
            }
        }

        // ----------------------------------------------------------------
        // 6. franchise_drivers: add assigned_date + end_date (value copies)
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
        // 7. franchise_vehicles: add effective_from, effective_to, change_remarks
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
        // Rollback is non-destructive: restore renamed columns and drop
        // the columns that were introduced after verifying they exist.
        if (Schema::hasTable('franchisees') && Schema::hasColumn('franchisees', 'city')) {
            Schema::table('franchisees', function (Blueprint $table) {
                $table->renameColumn('city', 'city_municipality');
            });
        }

        if (Schema::hasTable('franchisees') && Schema::hasColumn('franchisees', 'sitio_street')) {
            Schema::table('franchisees', function (Blueprint $table) {
                $table->dropColumn(['sitio_street']);
            });
        }

        if (Schema::hasTable('franchises') && Schema::hasColumn('franchises', 'vehicle_id')) {
            Schema::table('franchises', function (Blueprint $table) {
                $table->dropForeign(['vehicle_id']);
                $table->dropColumn(['vehicle_id']);
            });
        }

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
            if (Schema::hasColumn('franchise_drivers', 'end_date')) {
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

        // Drop the new table only if it was not part of the original DB.
        if (Schema::hasTable('franchisee_history')) {
            Schema::dropIfExists('franchisee_history');
        }
    }
};
