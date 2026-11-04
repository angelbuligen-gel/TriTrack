<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Driver
    |--------------------------------------------------------------------------
    |
    | "semaphore" sends real SMS through the Semaphore gateway (Philippines).
    | "log" writes the message to storage/logs/laravel.log and is intended
    | for local development only - never use it in production.
    |
    */

    'driver' => env('SMS_DRIVER', 'log'),

    'semaphore' => [
        'api_key' => env('SEMAPHORE_API_KEY'),
        'sender_name' => env('SEMAPHORE_SENDER_NAME'),
        'endpoint' => env('SEMAPHORE_ENDPOINT', 'https://api.semaphore.co/api/v4/messages'),
        'timeout' => (int) env('SEMAPHORE_TIMEOUT', 15),
    ],

];
