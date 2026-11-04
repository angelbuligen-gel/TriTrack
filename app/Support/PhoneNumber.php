<?php

namespace App\Support;

/**
 * Philippine mobile number helpers.
 *
 * Canonical storage format is E.164 (+639XXXXXXXXX).
 * Accepted input: 09XXXXXXXXX, 9XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX.
 */
final class PhoneNumber
{
    public const PATTERN = '/^(?:\+?63|0)9\d{9}$/';

    public static function normalize(?string $number): ?string
    {
        if ($number === null) {
            return null;
        }

        $digits = preg_replace('/[^0-9+]/', '', $number) ?? '';

        if (str_starts_with($digits, '+63')) {
            $digits = substr($digits, 3);
        } elseif (str_starts_with($digits, '63')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (! preg_match('/^9\d{9}$/', $digits)) {
            return null;
        }

        return '+63'.$digits;
    }

    /**
     * e.g. "+63 917 *** 4567"
     */
    public static function mask(?string $number): string
    {
        $normalized = self::normalize($number);

        if ($normalized === null) {
            return '***********';
        }

        $digits = substr($normalized, 3); // 9XXXXXXXXX

        return sprintf(
            '+63 %s *** %s',
            substr($digits, 0, 3),
            substr($digits, -4),
        );
    }

    /**
     * Format expected by the Semaphore gateway: 639XXXXXXXXX.
     */
    public static function toGatewayFormat(?string $number): ?string
    {
        $normalized = self::normalize($number);

        return $normalized === null
            ? null
            : ltrim($normalized, '+');
    }
}
