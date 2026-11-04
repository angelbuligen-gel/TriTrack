<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(
            new UserResource($request->user()),
            'Profile retrieved successfully.',
        );
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', 'unique:users,email,'.$request->user()->id],
        ]);

        $request->user()->update($validated);

        return ApiResponse::success(
            new UserResource($request->user()->fresh()),
            'Profile updated successfully.',
        );
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            return ApiResponse::error(
                'The current password is incorrect.',
                ['current_password' => ['The current password is incorrect.']],
                422,
            );
        }

        $request->user()->update(['password' => $validated['password']]);

        return ApiResponse::success(null, 'Password changed successfully.');
    }
}
