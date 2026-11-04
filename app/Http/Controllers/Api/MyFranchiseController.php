<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FranchiseResource;
use App\Http\Resources\FranchiseDriverResource;
use App\Http\Resources\FranchiseVehicleResource;
use App\Http\Resources\FranchiseeResource;
use App\Http\Resources\UserResource;
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
