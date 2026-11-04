<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\ActivityLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(private readonly ActivityLogger $activity) {}

    public function index(): JsonResponse
    {
        $settings = SystemSetting::query()
            ->orderBy('group')
            ->orderBy('label')
            ->get()
            ->map(fn (SystemSetting $setting) => [
                'id' => $setting->id,
                'key' => $setting->key,
                'value' => $setting->castedValue(),
                'raw_value' => $setting->value,
                'type' => $setting->type,
                'group' => $setting->group,
                'label' => $setting->label,
                'description' => $setting->description,
            ])
            ->groupBy('group');

        return ApiResponse::success($settings, 'Settings retrieved successfully.');
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', 'exists:system_settings,key'],
            'settings.*.value' => ['nullable'],
        ]);

        $updated = [];

        foreach ($validated['settings'] as $item) {
            $setting = SystemSetting::query()->where('key', $item['key'])->first();

            if ($setting === null) {
                continue;
            }

            $value = $item['value'] ?? null;

            if ($setting->type === 'json' && is_array($value)) {
                $value = json_encode($value);
            } elseif ($setting->type === 'boolean') {
                $value = $value ? '1' : '0';
            } elseif ($value !== null) {
                $value = (string) $value;
            }

            $setting->update(['value' => $value]);
            $updated[] = $setting->key;
        }

        $this->activity->log('settings.updated', 'System settings updated: '.implode(', ', $updated).'.', $request->user());

        return ApiResponse::success($this->index()->getData(true)['data'], 'Settings updated successfully.');
    }
}
