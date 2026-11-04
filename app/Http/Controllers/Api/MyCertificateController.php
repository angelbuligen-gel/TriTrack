<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Models\Certificate;
use App\Models\Franchisee;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyCertificateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $franchisee = Franchisee::query()->where('user_id', $request->user()->id)->first();

        if ($franchisee === null) {
            return ApiResponse::success([], 'No certificates are linked to your account yet.');
        }

        $paginated = Certificate::query()
            ->with(['application.franchise', 'application.franchisee', 'issuedBy'])
            ->whereHas('application', fn (Builder $query) => $query
                ->where('franchisee_id', $franchisee->id))
            ->when($request->filled('type'), fn (Builder $query) => $query
                ->where('certificate_type', $request->string('type')->toString()))
            ->orderByDesc('issued_at')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            CertificateResource::collection($paginated),
            'Your certificates were retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }
}
