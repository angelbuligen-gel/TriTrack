<?php

namespace App\Exceptions;

use RuntimeException;

class OtpException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode = 'otp_error',
        public readonly int $status = 422,
        public readonly array $context = [],
    ) {
        parent::__construct($message);
    }

    public static function notRequested(): self
    {
        return new self(
            'No verification code was requested for this number. Please request a new code.',
            'otp_not_found',
        );
    }

    public static function expired(): self
    {
        return new self(
            'This verification code has expired. Please request a new code.',
            'otp_expired',
        );
    }

    public static function invalid(int $remainingAttempts): self
    {
        return new self(
            'The verification code is incorrect.',
            'otp_invalid',
            422,
            ['remaining_attempts' => $remainingAttempts],
        );
    }

    public static function tooManyAttempts(): self
    {
        return new self(
            'Too many incorrect attempts. Please request a new verification code.',
            'otp_attempts_exhausted',
            429,
        );
    }

    public static function alreadyUsed(): self
    {
        return new self(
            'This verification code has already been used. Please request a new code.',
            'otp_used',
        );
    }

    public static function revoked(): self
    {
        return new self(
            'This verification code is no longer valid because a newer code was issued.',
            'otp_revoked',
        );
    }

    public static function cooldown(int $retryAfter): self
    {
        return new self(
            "Please wait {$retryAfter} seconds before requesting another verification code.",
            'otp_cooldown',
            429,
            ['retry_after' => $retryAfter],
        );
    }

    public static function sendLimitReached(int $retryAfter): self
    {
        return new self(
            'You have requested too many verification codes. Please try again later.',
            'otp_send_limit',
            429,
            ['retry_after' => $retryAfter],
        );
    }
}
