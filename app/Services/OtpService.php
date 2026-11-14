<?php

namespace App\Services;

use App\Contracts\SmsSender;
use App\Exceptions\OtpException;
use App\Models\OtpVerification;
use App\Models\User;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

class OtpService
{
    public const PURPOSE_PHONE_VERIFICATION = 'phone_verification';

    public const PURPOSE_PASSWORD_RESET = 'password_reset';

    public function __construct(
        private readonly SmsSender $sms,
        private readonly Hasher $hasher,
    ) {}

    /**
     * Issue a fresh OTP, revoke any older one, and send it by SMS.
     *
     * The plain-text code never leaves this service: it is hashed for
     * storage and only used to build the outgoing SMS body.
     *
     * @throws OtpException when the resend cooldown or hourly cap is hit
     * @throws \App\Exceptions\SmsDeliveryException when the gateway fails
     */
    public function issue(
        User $user,
        ?string $ipAddress = null,
        string $purpose = self::PURPOSE_PHONE_VERIFICATION,
    ): OtpVerification {
        $this->assertCanSend($user, $purpose);

        $code = $this->generateCode();
        $expiresAt = now()->addMinutes((int) config('otp.expiry_minutes'));

        $otp = DB::transaction(function () use ($user, $purpose, $code, $expiresAt, $ipAddress) {
            // Invalidate every previously issued, still-active code.
            OtpVerification::query()
                ->where('user_id', $user->id)
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);

            return OtpVerification::create([
                'user_id' => $user->id,
                'purpose' => $purpose,
                'mobile_number' => $user->mobile_number,
                'code_hash' => $this->hasher->make($code),
                'expires_at' => $expiresAt,
                'last_sent_at' => now(),
                'max_attempts' => (int) config('otp.max_attempts'),
                'ip_address' => $ipAddress,
            ]);
        });

        $this->sms->send($user->mobile_number, $this->message($code));

        RateLimiter::hit($this->sendLimitKey($user), 3600);

        return $otp;
    }

    /**
     * Verify a submitted code. Codes are single use and attempt limited.
     *
     * @throws OtpException
     */
    public function verify(
        User $user,
        string $code,
        string $purpose = self::PURPOSE_PHONE_VERIFICATION,
    ): OtpVerification {
        $otp = OtpVerification::query()
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->latest('id')
            ->first();

        if ($otp === null) {
            throw OtpException::notRequested();
        }

        if ($otp->consumed_at !== null) {
            throw OtpException::alreadyUsed();
        }

        if ($otp->revoked_at !== null) {
            throw OtpException::revoked();
        }

        if ($otp->hasExhaustedAttempts()) {
            throw OtpException::tooManyAttempts();
        }

        if ($otp->isExpired()) {
            throw OtpException::expired();
        }

        if (! $this->hasher->check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            $otp->refresh();

            if ($otp->hasExhaustedAttempts()) {
                throw OtpException::tooManyAttempts();
            }

            throw OtpException::invalid($otp->max_attempts - $otp->attempts);
        }

        $otp->forceFill(['consumed_at' => now()])->save();

        return $otp;
    }

    /**
     * Seconds until the account may request another code.
     */
    public function resendAvailableIn(User $user, string $purpose = self::PURPOSE_PHONE_VERIFICATION): int
    {
        $latest = OtpVerification::query()
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->latest('id')
            ->first();

        if ($latest === null) {
            return 0;
        }

        $availableAt = $latest->last_sent_at
            ->copy()
            ->addSeconds((int) config('otp.resend_cooldown_seconds'));

        return max(0, (int) Carbon::now()->diffInSeconds($availableAt, false));
    }

    private function assertCanSend(User $user, string $purpose): void
    {
        $waitFor = $this->resendAvailableIn($user, $purpose);

        if ($waitFor > 0) {
            throw OtpException::cooldown($waitFor);
        }

        $key = $this->sendLimitKey($user);
        $max = (int) config('otp.max_sends_per_hour');

        if (RateLimiter::tooManyAttempts($key, $max)) {
            throw OtpException::sendLimitReached(RateLimiter::availableIn($key));
        }
    }

    private function sendLimitKey(User $user): string
    {
        return 'otp-send:'.$user->id;
    }

    private function generateCode(): string
    {
        $length = (int) config('otp.length');
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }

    private function message(string $code): string
    {
        $minutes = (int) config('otp.expiry_minutes');

        return "Your TrikeTrack verification code is {$code}. "
            ."It expires in {$minutes} minutes. Never share this code with anyone.";
    }
}
