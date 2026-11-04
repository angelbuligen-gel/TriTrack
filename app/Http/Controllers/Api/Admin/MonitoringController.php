<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\Certificate;
use App\Models\Franchise;
use App\Models\Payment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MonitoringController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return ApiResponse::success([
            'users' => [
                'total' => User::query()->count(),
                'by_role' => User::query()
                    ->select('role', DB::raw('COUNT(*) as total'))
                    ->groupBy('role')
                    ->pluck('total', 'role'),
                'by_status' => User::query()
                    ->select('account_status', DB::raw('COUNT(*) as total'))
                    ->groupBy('account_status')
                    ->pluck('total', 'account_status'),
                'pending_activation' => User::query()
                    ->where('role', User::ROLE_FRANCHISEE)
                    ->where('account_status', User::STATUS_PENDING)
                    ->whereNotNull('phone_verified_at')
                    ->count(),
            ],
            'franchises' => [
                'total' => Franchise::query()->count(),
                'active' => Franchise::query()->where('franchise_status', Franchise::STATUS_ACTIVE)->count(),
                'expiring_soon' => Franchise::query()
                    ->whereBetween('expiration_date', [now()->toDateString(), now()->addDays(60)->toDateString()])
                    ->count(),
            ],
            'applications' => [
                'total' => Application::query()->count(),
                'open' => Application::query()->whereIn('status', Application::OPEN_STATUSES)->count(),
                'by_status' => Application::query()
                    ->select('status', DB::raw('COUNT(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status'),
            ],
            'payments' => [
                'total_collected' => (float) Payment::query()
                    ->where('status', Payment::STATUS_SUCCESSFUL)
                    ->sum('amount'),
                'pending_verification' => Payment::query()
                    ->where('status', Payment::STATUS_PENDING)
                    ->count(),
            ],
            'certificates' => [
                'total' => Certificate::query()->count(),
                'issued_this_month' => Certificate::query()
                    ->whereBetween('issued_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
            ],
            'recent_activity' => ActivityLogResource::collection(
                ActivityLog::query()->with('user')->orderByDesc('id')->limit(10)->get(),
            ),
        ], 'System monitoring summary retrieved successfully.');
    }
}
