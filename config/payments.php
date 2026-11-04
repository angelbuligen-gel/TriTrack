<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Active Payment Gateway
    |--------------------------------------------------------------------------
    |
    | "simulated" keeps everything local and requires treasury personnel to
    | verify each transaction. "paymongo" creates a hosted checkout session
    | and receives signed webhooks from the provider.
    |
    */

    'default' => env('PAYMENT_DRIVER', 'simulated'),

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    'receipt_email' => env('PAYMENT_RECEIPT_EMAIL', 'treasury@tritrack.local'),

    'simulated_checkout_url' => env('PAYMENT_SIMULATED_CHECKOUT_URL'),

    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'public_key' => env('PAYMONGO_PUBLIC_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
    ],

];
