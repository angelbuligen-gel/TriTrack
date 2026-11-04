<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $paginated = ActivityLog::query()
            ->with('user')
            ->when($request->filled('action'), fn (Builder $query) => $query
                ->where('action', 'like', $request->string('action')->toString().'%'))
            ->when($request->filled('user_id'), fn (Builder $query) => $query
                ->where('user_id', $request->integer('user_id')))
            ->when($request->filled('role'), fn (Builder $query) => $query
                ->whereHas('user', fn (Builder $inner) => $inner
                    ->where('role', $request->string('role')->toString())))
            ->when($request->filled('q'), fn (Builder $query) => $query
                ->where('description', 'like', '%'.$request->string('q')->toString().'%'))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 25), 100));

        return ApiResponse::success(
            ActivityLogResource::collection($paginated),
            'Activity logs retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }
}
