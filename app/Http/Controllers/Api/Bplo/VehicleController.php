<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Http\Requests\VehicleRequest;
use App\Http\Resources\VehicleResource;
use App\Models\Vehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Vehicle::query()
            ->with('currentFranchises.franchisee')
            ->search($request->string('q')->toString())
            ->when($request->filled('status'), fn ($inner) => $inner->where(
                'vehicle_status',
                $request->input('status'),
            ))
            ->orderByDesc('id');

        $paginated = $query->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            VehicleResource::collection($paginated),
            'Vehicle records retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Vehicle $vehicle): JsonResponse
    {
        $vehicle->load([
            'currentFranchises.franchisee',
            'franchiseAssignments.franchise.franchisee',
        ]);

        return ApiResponse::success(
            new VehicleResource($vehicle),
            'Vehicle record retrieved successfully.',
        );
    }

    public function store(VehicleRequest $request): JsonResponse
    {
        $vehicle = Vehicle::create($request->validated());

        return ApiResponse::success(
            new VehicleResource($vehicle->load('currentFranchises')),
            'Vehicle record created successfully.',
            201,
        );
    }

    public function update(VehicleRequest $request, Vehicle $vehicle): JsonResponse
    {
        $vehicle->update($request->validated());

        return ApiResponse::success(
            new VehicleResource($vehicle->fresh()->load('currentFranchises')),
            'Vehicle record updated successfully.',
        );
    }
}
