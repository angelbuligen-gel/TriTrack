<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public function log(
        string $action,
        string $description,
        ?User $user = null,
        mixed $subject = null,
    ): ActivityLog {
        $request = request();

        return ActivityLog::create([
            'user_id' => ($user ?? Auth::user())?->id,
            'action' => $action,
            'subject_type' => $subject === null ? null : $subject::class,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'ip_address' => $request instanceof Request ? $request->ip() : null,
            'user_agent' => $request instanceof Request ? mb_substr((string) $request->userAgent(), 0, 255) : null,
        ]);
    }
}
