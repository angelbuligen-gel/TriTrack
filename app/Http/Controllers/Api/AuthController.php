<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\OtpException;
use App\Exceptions\SmsDeliveryException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\OtpVerification;
use App\Models\User;
use App\Services\OtpService;
use App\Support\ApiResponse;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    /**
     * Step 1 of registration: create the pending franchisee account and
     * send a 6-digit OTP to the submitted mobile number.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            [$user, $otp] = DB::transaction(function () use ($data, $request) {
                $user = User::create([
                    'name' => $data['name'],
                    'email' => Str::lower($data['email']),
                    'mobile_number' => PhoneNumber::normalize($data['mobile_number']),
                    'password' => $data['password'],
                    'role' => User::ROLE_FRANCHISEE,
                    'account_status' => User::STATUS_PENDING,
                ]);

                $otp = $this->otp->issue($user, $request->ip());

                return [$user, $otp];
            });
        } catch (SmsDeliveryException $e) {
            return ApiResponse::error($e->getMessage(), [], 502);
        }

        return ApiResponse::success([
            'user' => new UserResource($user),
            'verification' => $this->verificationPayload($otp),
        ], 'Registration received. Enter the 6-digit code sent to your mobile number.', 201);
    }

    /**
     * Step 2 of registration: confirm the OTP and mark the number verified.
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $user = $this->findByMobile($request->string('mobile_number')->toString());

        if ($user === null) {
            return ApiResponse::error(
                'No registration was found for this mobile number.',
                ['code' => ['otp_user_not_found']],
                422,
            );
        }

        if ($user->isPhoneVerified()) {
            return ApiResponse::error(
                'This mobile number is already verified. You can sign in.',
                ['code' => ['already_verified']],
                409,
            );
        }

        try {
            $this->otp->verify($user, $request->string('otp')->toString());
        } catch (OtpException $e) {
            return ApiResponse::error($e->getMessage(), $this->otpErrors($e), $e->status);
        }

        $user->forceFill(['phone_verified_at' => now()])->save();

        return ApiResponse::success([
            'phone_verified' => true,
            'account_status' => $user->account_status,
            'can_login' => true,
        ], 'Your mobile number has been verified. You can now sign in.');
    }

    /**
     * Re-issue an OTP, respecting cooldown and hourly send limits.
     */
    public function resendOtp(ResendOtpRequest $request): JsonResponse
    {
        $user = $this->findByMobile($request->string('mobile_number')->toString());

        if ($user === null) {
            return ApiResponse::error(
                'No registration was found for this mobile number.',
                ['code' => ['otp_user_not_found']],
                422,
            );
        }

        if ($user->isPhoneVerified()) {
            return ApiResponse::error(
                'This mobile number is already verified. You can sign in.',
                ['code' => ['already_verified']],
                409,
            );
        }

        try {
            $otp = $this->otp->issue($user, $request->ip());
        } catch (OtpException $e) {
            return ApiResponse::error($e->getMessage(), $this->otpErrors($e), $e->status);
        } catch (SmsDeliveryException $e) {
            return ApiResponse::error($e->getMessage(), [], 502);
        }

        return ApiResponse::success(
            ['verification' => $this->verificationPayload($otp)],
            'A new verification code has been sent to your mobile number.',
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier')->toString());
        $throttleKey = 'login:'.Str::lower($identifier).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return ApiResponse::error(
                'Too many login attempts. Please try again later.',
                ['retry_after' => [RateLimiter::availableIn($throttleKey)]],
                429,
            );
        }

        $user = $this->findByIdentifier($identifier);

        if ($user === null || ! Hash::check($request->string('password')->toString(), $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            return ApiResponse::error(
                'These credentials do not match our records.',
                ['identifier' => ['These credentials do not match our records.']],
                401,
            );
        }

        // OTP phone verification applies to franchisee self-registration.
        // Staff accounts are created and activated by an administrator.
        if ($user->isFranchisee() && ! $user->isPhoneVerified()) {
            return ApiResponse::error(
                'Your mobile number is not verified yet. Please complete OTP verification.',
                ['code' => ['phone_unverified']],
                403,
            );
        }

        if ($user->isSuspended()) {
            return ApiResponse::error(
                'This account is suspended. Please contact the administrator.',
                ['code' => ['account_suspended']],
                403,
            );
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken(
            $request->string('device_name')->toString() ?: 'tritrack-web',
            ['*'],
        );

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 'Signed in successfully.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Signed out successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(
            new UserResource($request->user()),
            'Account retrieved successfully.',
        );
    }

    private function findByMobile(string $mobileNumber): ?User
    {
        $normalized = PhoneNumber::normalize($mobileNumber);

        if ($normalized === null) {
            return null;
        }

        return User::query()->where('mobile_number', $normalized)->first();
    }

    private function findByIdentifier(string $identifier): ?User
    {
        $mobile = PhoneNumber::normalize($identifier);

        return User::query()
            ->where('email', Str::lower($identifier))
            ->when($mobile !== null, fn ($query) => $query->orWhere('mobile_number', $mobile))
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function verificationPayload(OtpVerification $otp): array
    {
        return [
            'mobile_number' => PhoneNumber::mask($otp->mobile_number),
            'expires_at' => $otp->expires_at->toIso8601String(),
            'expires_in_seconds' => max(0, (int) now()->diffInSeconds($otp->expires_at, false)),
            'resend_available_in' => (int) config('otp.resend_cooldown_seconds'),
            'attempts_allowed' => $otp->max_attempts,
        ];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function otpErrors(OtpException $e): array
    {
        $errors = ['code' => [$e->errorCode]];

        foreach ($e->context as $key => $value) {
            $errors[$key] = [$value];
        }

        return $errors;
    }
}
