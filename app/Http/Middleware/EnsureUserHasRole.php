<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Usage: ->middleware('role:bplo,tresury')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponse::error('Unauthenticated.', [], 401);
        }

        if (! $user->hasRole(...$roles)) {
            return ApiResponse::error(
                'You are not authorized to access this resource.',
                [],
                403,
            );
        }

        return $next($request);
    }
}
