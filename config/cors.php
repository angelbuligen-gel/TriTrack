<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
     * The React application is served from its own origin (Vite).
     * Add production origins to CORS_ALLOWED_ORIGINS when deploying.
     */
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
     * Authentication uses Sanctum bearer tokens, not cookies.
     */
    'supports_credentials' => false,

];
