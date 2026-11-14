<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/*
 * The franchisee registration UI now lives in the separate React
 * application. Keep this entry point working for old links/bookmarks.
 */
Route::get('/franchisee/register', function () {
    $frontend = rtrim((string) config('app.frontend_url'), '/');

    return redirect()->away($frontend.'/register');
})->name('franchisee.register');

/*
|--------------------------------------------------------------------------
| Guest authentication routes
|--------------------------------------------------------------------------
|
| The user-facing login/register are served by the React single-page app.
| These named routes give the server-side welcome page's auth links a
| target instead of leaving @if (Route::has('login')) blocks pointing at
| an undefined route (the API only defines POST /auth/login and /auth/register).
*/
Route::get('login', function () {
    return redirect()->to(config('app.frontend_url').'/login');
})->name('login');

Route::get('register', function () {
    return redirect()->to(config('app.frontend_url').'/register');
})->name('register');
