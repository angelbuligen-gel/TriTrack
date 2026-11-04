<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignmentRequest;
use App\Http\Requests\FranchiseRequest;
use App\Http\Resources\FranchiseDriverResource;
use App\Http\Resources\FranchiseResource;
use App\Http\Resources\FranchiseVehicleResource;
use App\Models\Driver;
use App\Models\Franchise;
use App\Models\FranchiseDriver;
use App\Models\FranchiseVehicle;
use App\Models\Vehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FranchiseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Franchise::query()
            ->with('franchisee')
            ->search($request->string('q')->toString())
            ->when($request->filled('status'), fn ($inner) => $inner->where(
                'franchise_status',
                $request->input('status'),
            ))
            ->when($request->filled('franchisee_id'), fn ($inner) => $inner->where(
                'franchisee_id',
                $request->integer('franchisee_id'),
            ))
            ->orderByDesc('id');

        $paginated = $query->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            FranchiseResource::collection($paginated),
            'Franchise records retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Franchise $franchise): JsonResponse
    {
        $franchise->load([
            'franchisee',
            'driverAssignments.driver',
            'vehicleAssignments.vehicle',
            'driverHistory.driver',
            'vehicleHistory.vehicle',
        ]);

        return ApiResponse::success(
            new FranchiseResource($franchise),
            'Franchise record retrieved successfully.',
        );
    }

    public function store(FranchiseRequest $request): JsonResponse
    {
        $franchise = Franchise::create($request->validated());

        return ApiResponse::success(
            new FranchiseResource($franchise->load('franchisee')),
            'Franchise record created successfully.',
            201,
        );
    }

    public function update(FranchiseRequest $request, Franchise $franchise): JsonResponse
    {
        $franchise->update($request->validated());

        return ApiResponse::success(
            new FranchiseResource($franchise->fresh()->load('franchisee')),
            'Franchise record updated successfully.',
        );
    }

    /**
     * Assign a driver to a franchise. The driver's previous active
     * assignment is ended (kept as history) before this one begins.
     */
    public function assignDriver(AssignmentRequest $request, Franchise $franchise): JsonResponse
    {
        $data = $request->validated();
        $driver = Driver::findOrFail($data['driver_id']);

        $alreadyActive = FranchiseDriver::query()
            ->where('franchise_id', $franchise->id)
            ->where('driver_id', $driver->id)
            ->where('assignment_status', 'active')
            ->exists();

        if ($alreadyActive) {
            return ApiResponse::error(
                'This driver is already assigned to this franchise.',
                ['driver_id' => ['Already assigned to this franchise.']],
                409,
            );
        }

        // Close the driver's active assignment on any other franchise,
        // keeping that history row intact.
        FranchiseDriver::query()
            ->where('driver_id', $driver->id)
            ->where('franchise_id', '!=', $franchise->id)
            ->where('assignment_status', 'active')
            ->get()
            ->each(fn (FranchiseDriver $row) => $row->update([
                'assignment_status' => 'ended',
                'assigned_until' => $row->assigned_until ?? $data['assigned_from'],
            ]));

        $assignment = FranchiseDriver::create([
            'franchise_id' => $franchise->id,
            'driver_id' => $driver->id,
            'assigned_from' => $data['assigned_from'],
            'assigned_until' => $data['assigned_until'] ?? null,
            'is_primary' => (bool) ($data['is_primary'] ?? false),
            'assignment_status' => $data['assignment_status'] ?? 'active',
        ]);

        return ApiResponse::success(
            new FranchiseDriverResource($assignment->load('driver')),
            'Driver assigned to the franchise.',
            201,
        );
    }

    /**
     * End an active driver assignment. The row is kept so the history
     * of who drove which franchise remains intact.
     */
    public function endDriverAssignment(Franchise $franchise, FranchiseDriver $assignment): JsonResponse
    {
        $this->assertAssignmentBelongsToFranchise($assignment, $franchise->id);

        $assignment->update([
            'assignment_status' => 'ended',
            'assigned_until' => $assignment->assigned_until ?? now()->toDateString(),
        ]);

        return ApiResponse::success(
            new FranchiseDriverResource($assignment->fresh()->load('driver')),
            'Driver assignment ended.',
        );
    }

    public function assignVehicle(AssignmentRequest $request, Franchise $franchise): JsonResponse
    {
        $data = $request->validated();
        $vehicle = Vehicle::findOrFail($data['vehicle_id']);

        $alreadyActive = FranchiseVehicle::query()
            ->where('franchise_id', $franchise->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('assignment_status', 'active')
            ->exists();

        if ($alreadyActive) {
            return ApiResponse::error(
                'This vehicle is already assigned to this franchise.',
                ['vehicle_id' => ['Already assigned to this franchise.']],
                409,
            );
        }

        // Close the vehicle's active assignment on any other franchise,
        // keeping that history row intact.
        FranchiseVehicle::query()
            ->where('vehicle_id', $vehicle->id)
            ->where('franchise_id', '!=', $franchise->id)
            ->where('assignment_status', 'active')
            ->get()
            ->each(fn (FranchiseVehicle $row) => $row->update([
                'assignment_status' => 'ended',
                'assigned_until' => $row->assigned_until ?? $data['assigned_from'],
            ]));

        $assignment = FranchiseVehicle::create([
            'franchise_id' => $franchise->id,
            'vehicle_id' => $vehicle->id,
            'assigned_from' => $data['assigned_from'],
            'assigned_until' => $data['assigned_until'] ?? null,
            'assignment_status' => $data['assignment_status'] ?? 'active',
        ]);

        return ApiResponse::success(
            new FranchiseVehicleResource($assignment->load('vehicle')),
            'Vehicle assigned to the franchise.',
            201,
        );
    }

    public function endVehicleAssignment(Franchise $franchise, FranchiseVehicle $assignment): JsonResponse
    {
        $this->assertAssignmentBelongsToFranchise($assignment, $franchise->id);

        $assignment->update([
            'assignment_status' => 'ended',
            'assigned_until' => $assignment->assigned_until ?? now()->toDateString(),
        ]);

        return ApiResponse::success(
            new FranchiseVehicleResource($assignment->fresh()->load('vehicle')),
            'Vehicle assignment ended.',
        );
    }

    private function assertAssignmentBelongsToFranchise(FranchiseDriver|FranchiseVehicle $assignment, int $franchiseId): void
    {
        if ($assignment->franchise_id !== $franchiseId) {
            abort(404, 'The requested assignment was not found for this franchise.');
        }
    }
}
