<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Single JSON envelope for the whole API.
 *
 * Success: {"status":"success","message":"...","data":{...}}
 * Error:   {"status":"error","message":"...","errors":{...}}
 */
final class ApiResponse
{
    public static function success(
        mixed $data = null,
        string $message = 'Operation completed successfully.',
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        $payload = [
            'status' => 'success',
            'message' => $message,
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    public static function error(
        string $message,
        array $errors = [],
        int $status = 400,
    ): JsonResponse {
        return response()->json([
            'status' => 'error',
            'message' => $message,
            'errors' => (object) $errors,
        ], $status);
    }
}
