<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Code length
    |--------------------------------------------------------------------------
    |
    | Number of digits in a generated OTP.
    |
    */

    'length' => (int) env('OTP_LENGTH', 6),

    /*
    |--------------------------------------------------------------------------
    | Validity period
    |--------------------------------------------------------------------------
    |
    | Minutes an issued OTP remains valid.
    |
    */

    'expiry_minutes' => (int) env('OTP_EXPIRY_MINUTES', 5),

    /*
    |--------------------------------------------------------------------------
    | Failed verification attempts
    |--------------------------------------------------------------------------
    |
    | After this many wrong entries the code is locked and a new one must
    | be requested.
    |
    */

    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),

    /*
    |--------------------------------------------------------------------------
    | Resend cooldown
    |--------------------------------------------------------------------------
    |
    | Seconds a user must wait before requesting another code.
    |
    */

    'resend_cooldown_seconds' => (int) env('OTP_RESEND_COOLDOWN_SECONDS', 60),

    /*
    |--------------------------------------------------------------------------
    | Hourly send cap
    |--------------------------------------------------------------------------
    |
    | Maximum codes the same account may request per hour.
    |
    */

    'max_sends_per_hour' => (int) env('OTP_MAX_SENDS_PER_HOUR', 5),

];
