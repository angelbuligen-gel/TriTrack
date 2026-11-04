<?php

use App\Exceptions\WorkflowException;
use App\Http\Middleware\EnsureUserHasRole;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('The given data was invalid.', $e->errors(), 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('Unauthenticated.', [], 401);
        });

        $exceptions->render(function (WorkflowException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error($e->getMessage(), $e->errors, $e->status);
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('You are not authorized to perform this action.', [], 403);
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('The requested resource was not found.', [], 404);
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error(
                $e->getMessage() ?: 'The request could not be processed.',
                [],
                $e->getStatusCode(),
            );
        });
    })->create();
