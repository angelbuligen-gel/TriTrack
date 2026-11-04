<?php

namespace App\Http\Controllers\Api\Bplo;

use App\Http\Controllers\Controller;
use App\Http\Requests\FranchiseeRequest;
use App\Http\Requests\LinkAccountRequest;
use App\Http\Resources\FranchiseeResource;
use App\Models\Franchisee;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FranchiseeController extends Controller
{
    /**
     * List franchisee profiles with their linked account and franchises.
     */
    public function index(Request $request): JsonResponse
    {
        $keyword = $request->string('q')->toString();

        $query = Franchisee::query()
            ->with(['user', 'franchises'])
            ->when($keyword !== '', function ($inner) use ($keyword) {
                $inner->where(function ($franchisee) use ($keyword) {
                    $franchisee
                        ->where('first_name', 'like', "%{$keyword}%")
                        ->orWhere('last_name', 'like', "%{$keyword}%")
                        ->orWhere('contact_number', 'like', "%{$keyword}%")
                        ->orWhereHas('user', fn ($user) => $user->where('email', 'like', "%{$keyword}%"));
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name');

        $paginated = $query->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            FranchiseeResource::collection($paginated),
            'Franchisee records retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    /**
     * Franchisee accounts that are not linked to any profile yet,
     * used by the BPLO account-linking dialog.
     */
    public function accounts(Request $request): JsonResponse
    {
        $keyword = $request->string('q')->toString();

        $users = User::query()
            ->where('role', User::ROLE_FRANCHISEE)
            ->whereDoesntHave('franchiseeProfile')
            ->when($keyword !== '', fn ($query) => $query
                ->where(fn ($inner) => $inner
                    ->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhere('mobile_number', 'like', "%{$keyword}%")))
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'phone_verified' => $user->isPhoneVerified(),
                'account_status' => $user->account_status,
            ]);

        return ApiResponse::success($users, 'Unlinked franchisee accounts retrieved successfully.');
    }

    public function show(Franchisee $franchisee): JsonResponse
    {
        $franchisee->load([
            'user',
            'franchises.driverAssignments.driver',
            'franchises.vehicleAssignments.vehicle',
        ]);

        return ApiResponse::success(
            new FranchiseeResource($franchisee),
            'Franchisee record retrieved successfully.',
        );
    }

    public function store(FranchiseeRequest $request): JsonResponse
    {
        $franchisee = Franchisee::create([
            ...$request->validated(),
            'contact_number' => PhoneNumber::normalize($request->input('contact_number')),
        ]);

        return ApiResponse::success(
            new FranchiseeResource($franchisee->load('franchises')),
            'Franchisee record created successfully.',
            201,
        );
    }

    public function update(FranchiseeRequest $request, Franchisee $franchisee): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('contact_number', $data)) {
            $data['contact_number'] = PhoneNumber::normalize($data['contact_number'])
                ?? $data['contact_number'];
        }

        $franchisee->update($data);

        return ApiResponse::success(
            new FranchiseeResource($franchisee->fresh()->load('user', 'franchises')),
            'Franchisee record updated successfully.',
        );
    }

    /**
     * Link an existing franchisee account to this profile.
     * Linking is a BPLO action: OTP verification alone never links accounts.
     */
    public function linkAccount(LinkAccountRequest $request, Franchisee $franchisee): JsonResponse
    {
        $user = User::findOrFail($request->integer('user_id'));

        if ($franchisee->user_id === $user->id) {
            return ApiResponse::success(
                new FranchiseeResource($franchisee->load('user')),
                'This account is already linked to this franchisee record.',
            );
        }

        $otherProfile = Franchisee::query()
            ->where('user_id', $user->id)
            ->whereKeyNot($franchisee->id)
            ->first();

        if ($otherProfile !== null) {
            return ApiResponse::error(
                'This account is already linked to another franchisee record.',
                ['user_id' => ['Already linked to another franchisee record.']],
                409,
            );
        }

        $franchisee->update(['user_id' => $user->id]);

        return ApiResponse::success(
            new FranchiseeResource($franchisee->fresh()->load('user')),
            'Account linked to the franchisee record.',
        );
    }

    public function unlinkAccount(Franchisee $franchisee): JsonResponse
    {
        if ($franchisee->user_id === null) {
            return ApiResponse::error(
                'This franchisee record has no linked account.',
                [],
                404,
            );
        }

        $franchisee->update(['user_id' => null]);

        return ApiResponse::success(
            new FranchiseeResource($franchisee->fresh()),
            'Account unlinked from the franchisee record.',
        );
    }
}
