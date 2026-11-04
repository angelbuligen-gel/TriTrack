<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\WorkflowException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStaffRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Staff account administration. Franchisee accounts are managed by BPLO;
 * this screen only creates and maintains BPLO, treasury, and admin users.
 */
class UserController extends Controller
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = User::query()
            ->when($request->filled('role'), fn (Builder $query) => $query
                ->where('role', $request->string('role')->toString()))
            ->when($request->filled('status'), fn (Builder $query) => $query
                ->where('account_status', $request->string('status')->toString()))
            ->when($request->filled('q'), fn (Builder $query) => $query->where(function (Builder $inner) use ($request) {
                $keyword = $request->string('q')->toString();

                $inner
                    ->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhere('username', 'like', "%{$keyword}%")
                    ->orWhere('mobile_number', 'like', "%{$keyword}%");
            }))
            ->when($request->boolean('staff_only'), fn (Builder $query) => $query
                ->whereIn('role', [User::ROLE_BPLO, User::ROLE_TREASURY, User::ROLE_ADMINISTRATOR]))
            ->orderBy('role')
            ->orderBy('name')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return ApiResponse::success(
            UserResource::collection($paginated),
            'Users retrieved successfully.',
            200,
            $this->paginationMeta($paginated),
        );
    }

    public function store(StoreStaffRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'] ?? null,
            'email' => Str::lower($data['email']),
            'mobile_number' => $data['mobile_number'] ?? null,
            'password' => $data['password'],
            'role' => $data['role'],
            'account_status' => $data['account_status'],
            'phone_verified_at' => now(),
        ]);

        $this->activity->log('user.created', "Staff account {$user->email} created with role {$user->role}.", $request->user(), $user);

        return ApiResponse::success(
            new UserResource($user),
            'Staff account created successfully.',
            201,
        );
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponse::success(
            new UserResource($user),
            'User retrieved successfully.',
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('email', $data)) {
            $data['email'] = Str::lower($data['email']);
        }

        if (isset($data['role']) && $user->id === $request->user()->id && $data['role'] !== User::ROLE_ADMINISTRATOR) {
            throw WorkflowException::conflict('You cannot remove your own administrator role.');
        }

        $user->update($data);

        $this->activity->log('user.updated', "Staff account {$user->email} updated.", $request->user(), $user);

        return ApiResponse::success(
            new UserResource($user->fresh()),
            'User updated successfully.',
        );
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'account_status' => ['required', Rule::in([
                User::STATUS_PENDING,
                User::STATUS_ACTIVE,
                User::STATUS_SUSPENDED,
                User::STATUS_REJECTED,
            ])],
        ]);

        if ($user->id === $request->user()->id && $validated['account_status'] !== User::STATUS_ACTIVE) {
            throw WorkflowException::conflict('You cannot deactivate your own account.');
        }

        $user->update($validated);

        $this->activity->log(
            'user.status_changed',
            "Staff account {$user->email} set to {$validated['account_status']}.",
            $request->user(),
            $user,
        );

        return ApiResponse::success(
            new UserResource($user->fresh()),
            'Account status updated successfully.',
        );
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['nullable', 'string', 'confirmed', 'min:8'],
        ]);

        $password = $validated['password'] ?? Str::password(12, symbols: false);

        $user->update(['password' => $password]);

        $this->activity->log('user.password_reset', "Password reset for {$user->email}.", $request->user(), $user);

        return ApiResponse::success(
            ['temporary_password' => $validated['password'] ?? $password],
            'Password reset successfully. Share the temporary password securely.',
        );
    }
}
