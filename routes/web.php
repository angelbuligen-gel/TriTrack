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
