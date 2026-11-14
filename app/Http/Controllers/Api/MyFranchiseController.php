<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FranchiseResource;
use App\Http\Resources\FranchiseDriverResource;
use App\Http\Resources\FranchiseVehicleResource;
use App\Http\Resources\FranchiseeResource;
use App\Http\Resources\UserResource;
use App\Models\Driver;
use App\Models\Franchise;
use App\Models\Franchisee;
use App\Models\FranchiseDriver;
use App\Models\FranchiseVehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * All endpoints here are scoped to the signed-in franchisee's own records.
 */
class MyFranchiseController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        $franchisee = $this->profileFor($request->user()->id);

        return ApiResponse::success([
            'account' => new UserResource($request->user()),
            'has_profile' => $franchisee !== null,
            'profile' => $franchisee === null
                ? null
                : new FranchiseeResource($franchisee->load('franchises')),
        ], 'Account profile retrieved successfully.');
    }

    public function index(Request $request): JsonResponse
    {
        $franchiseIds = $this->franchiseIds($request->user()->id);

        $franchises = Franchise::query()
            ->with([
                'franchisee',
                'driverAssignments.driver',
                'vehicleAssignments.vehicle',
                'driverHistory.driver',
                'vehicleHistory.vehicle',
            ])
            ->whereIn('id', $franchiseIds)
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success(
            FranchiseResource::collection($franchises),
            'Your franchise records were retrieved successfully.',
        );
    }

    public function drivers(Request $request): JsonResponse
    {
        $franchiseIds = $this->franchiseIds($request->user()->id);

        $assignments = FranchiseDriver::query()
            ->with(['driver', 'franchise'])
            ->where('franchise_id', $franchiseIds)
            ->where('assignment_status', 'active')
            ->orderByDesc('assigned_from')
            ->get();

        return ApiResponse::success(
            FranchiseDriverResource::collection($assignments),
            'Your assigned drivers were retrieved successfully.',
        );
    }

    /**
     * Add a driver and assign them to one of this franchisee's franchises.
     */
    public function storeDriver(Request $request): JsonResponse
    {
        $validated = $request->validate($this->driverRules());
        $franchiseIds = $this->franchiseIds($request->user()->id);

        if ($franchiseIds === []) {
            return ApiResponse::error('No franchise is linked to your account yet.', [], 422);
        }

        $franchiseId = (int) ($validated['franchise_id'] ?? $franchiseIds[0]);

        if (! in_array($franchiseId, $franchiseIds, true)) {
            return ApiResponse::error('You may only add drivers to your own franchise.', [], 403);
        }

        $driver = Driver::create($this->driverAttributes($validated));

        $assignment = FranchiseDriver::create([
            'franchise_id' => $franchiseId,
            'driver_id' => $driver->id,
            'assigned_from' => now()->toDateString(),
            'is_primary' => (bool) ($validated['is_primary'] ?? false),
            'assignment_status' => 'active',
        ]);

        return ApiResponse::success(
            new FranchiseDriverResource($assignment->load(['driver', 'franchise'])),
            'Driver added. BPLO reviews driver records during application processing.',
            201,
        );
    }

    public function updateDriver(Request $request, Driver $driver): JsonResponse
    {
        $validated = $request->validate($this->driverRules());

        if (! $this->ownsDriver($request->user()->id, $driver)) {
            return ApiResponse::error('This driver is not assigned to your franchise.', [], 403);
        }

        $driver->update($this->driverAttributes($validated));

        $assignment = FranchiseDriver::query()
            ->with(['driver', 'franchise'])
            ->where('driver_id', $driver->id)
            ->whereIn('franchise_id', $this->franchiseIds($request->user()->id))
            ->where('assignment_status', 'active')
            ->first();

        return ApiResponse::success(
            $assignment === null ? $driver->fresh() : new FranchiseDriverResource($assignment),
            'Driver updated successfully.',
        );
    }

    /**
     * Archive (end) the driver assignment rather than deleting the record.
     */
    public function archiveDriver(Request $request, Driver $driver): JsonResponse
    {
        $assignment = FranchiseDriver::query()
            ->where('driver_id', $driver->id)
            ->whereIn('franchise_id', $this->franchiseIds($request->user()->id))
            ->where('assignment_status', 'active')
            ->first();

        if ($assignment === null) {
            return ApiResponse::error('This driver is not assigned to your franchise.', [], 403);
        }

        $assignment->update([
            'assignment_status' => 'ended',
            'assigned_until' => now()->toDateString(),
        ]);

        return ApiResponse::success(null, 'Driver archived. The record is kept for history.');
    }

    public function vehicles(Request $request): JsonResponse
    {
        $franchiseIds = $this->franchiseIds($request->user()->id);

        $assignments = FranchiseVehicle::query()
            ->with(['vehicle', 'franchise'])
            ->where('franchise_id', $franchiseIds)
            ->where('assignment_status', 'active')
            ->orderByDesc('assigned_from')
            ->get();

        return ApiResponse::success(
            FranchiseVehicleResource::collection($assignments),
            'Your assigned vehicles were retrieved successfully.',
        );
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function driverRules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'license_number' => ['nullable', 'string', 'max:50'],
            'license_expiry' => ['nullable', 'date'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'franchise_id' => ['nullable', 'integer'],
            'is_primary' => ['boolean'],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function driverAttributes(array $validated): array
    {
        return collect($validated)
            ->only([
                'first_name', 'middle_name', 'last_name', 'suffix',
                'license_number', 'license_expiry', 'contact_number', 'address',
            ])
            ->all();
    }

    private function ownsDriver(int $userId, Driver $driver): bool
    {
        return FranchiseDriver::query()
            ->where('driver_id', $driver->id)
            ->whereIn('franchise_id', $this->franchiseIds($userId))
            ->exists();
    }

    private function profileFor(int $userId): ?Franchisee
    {
        return Franchisee::query()->where('user_id', $userId)->first();
    }

    /**
     * @return array<int, int>
     */
    private function franchiseIds(int $userId): array
    {
        return Franchise::query()
            ->whereHas('franchisee', fn ($query) => $query->where('user_id', $userId))
            ->pluck('id')
            ->all();
    }
}
