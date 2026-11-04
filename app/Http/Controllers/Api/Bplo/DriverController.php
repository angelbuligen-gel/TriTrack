<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Http\Requests\DriverRequest;
use App\Http\Resources\DriverResource;
use App\Models\Driver;
use App\Support\ApiResponse;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Driver::query()
            ->with('currentFranchises.franchisee')
            ->search($request->string('q')->toString())
            ->orderBy('last_name')
            ->orderBy('first_name');

        $paginated = $query->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            DriverResource::collection($paginated),
            'Driver records retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function show(Driver $driver): JsonResponse
    {
        $driver->load([
            'currentFranchises.franchisee',
            'franchiseAssignments.franchise.franchisee',
        ]);

        return ApiResponse::success(
            new DriverResource($driver),
            'Driver record retrieved successfully.',
        );
    }

    public function store(DriverRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (filled($data['contact_number'] ?? null)) {
            $data['contact_number'] = PhoneNumber::normalize($data['contact_number'])
                ?? $data['contact_number'];
        }

        $driver = Driver::create($data);

        return ApiResponse::success(
            new DriverResource($driver->load('currentFranchises')),
            'Driver record created successfully.',
            201,
        );
    }

    public function update(DriverRequest $request, Driver $driver): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('contact_number', $data) && filled($data['contact_number'])) {
            $data['contact_number'] = PhoneNumber::normalize($data['contact_number'])
                ?? $data['contact_number'];
        }

        $driver->update($data);

        return ApiResponse::success(
            new DriverResource($driver->fresh()->load('currentFranchises')),
            'Driver record updated successfully.',
        );
    }
}
