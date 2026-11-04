<?php

namespace App\Providers;

use App\Contracts\SmsSender;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SemaphoreSmsSender;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SmsSender::class, function (): SmsSender {
            return match (config('sms.driver')) {
                'semaphore' => new SemaphoreSmsSender(
                    config('sms.semaphore.api_key'),
                    config('sms.semaphore.sender_name'),
                    (string) config('sms.semaphore.endpoint'),
                    (int) config('sms.semaphore.timeout'),
                ),
                default => new LogSmsSender(),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
