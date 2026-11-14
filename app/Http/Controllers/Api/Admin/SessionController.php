<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Active sign-in sessions. Tokens are Sanctum personal access tokens, so
 * terminating a session revokes that token immediately.
 */
class SessionController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activity,
        private readonly NotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = PersonalAccessToken::query()
            ->with('tokenable')
            ->when($request->filled('user_id'), fn (Builder $query) => $query
                ->where('tokenable_id', $request->integer('user_id'))
                ->where('tokenable_type', User::class))
            ->when($request->filled('role'), fn (Builder $query) => $query
                ->whereHasMorph('tokenable', [User::class], fn (Builder $inner) => $inner
                    ->where('role', $request->string('role')->toString())))
            ->when($request->filled('q'), fn (Builder $query) => $query
                ->whereHasMorph('tokenable', [User::class], fn (Builder $inner) => $inner
                    ->where('name', 'like', '%'.$request->string('q')->toString().'%')
                    ->orWhere('email', 'like', '%'.$request->string('q')->toString().'%')))
            ->orderByDesc('last_used_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        $currentTokenId = $request->user()?->currentAccessToken()?->id;

        $rows = collect($paginated->items())->map(function (PersonalAccessToken $token) use ($currentTokenId) {
            $user = $token->tokenable;

            return [
                'id' => $token->id,
                'name' => $token->name,
                'user' => $user instanceof User ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ] : null,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
                'is_current' => $token->id === $currentTokenId,
            ];
        });

        return ApiResponse::success($rows, 'Active sessions retrieved successfully.', 200, $this->paginationMeta($paginated));
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $session = PersonalAccessToken::query()->find($token);

        if ($session === null) {
            return ApiResponse::error('That session no longer exists.', [], 404);
        }

        $user = $session->tokenable;
        $currentTokenId = $request->user()?->currentAccessToken()?->id;

        if ($currentTokenId !== null && $session->id === $currentTokenId) {
            return ApiResponse::error('Use sign out to end the session you are using right now.', [], 409);
        }

        $session->delete();

        $this->activity->log(
            'session.terminated',
            "Session {$session->name} for ".($user instanceof User ? $user->email : 'unknown user').' terminated.',
            $request->user(),
        );

        if ($user instanceof User) {
            $this->notifications->sendEvent($user, 'session_terminated', [
                'reason' => 'Contact the administrator if you did not request this.',
            ]);
        }

        return ApiResponse::success(null, 'Session terminated.');
    }

    public function destroyForUser(Request $request, User $user): JsonResponse
    {
        // Ending every session keeps the caller signed in on this device so
        // an administrator cannot lock themselves out by accident.
        $currentTokenId = $request->user()?->currentAccessToken()?->id;

        $query = $user->tokens();

        if ($currentTokenId !== null) {
            $query->whereKeyNot($currentTokenId);
        }

        $deleted = $query->delete();

        $this->activity->log(
            'session.terminated_all',
            "All {$deleted} session(s) for {$user->email} terminated.",
            $request->user(),
            $user,
        );

        if ($user->id !== $request->user()->id) {
            $this->notifications->sendEvent($user, 'session_terminated', [
                'reason' => 'All of your sessions were ended by an administrator.',
            ]);
        }

        return ApiResponse::success(
            ['terminated' => $deleted],
            $deleted === 1 ? '1 session terminated.' : "{$deleted} sessions terminated.",
        );
    }
}
