<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\PaymentEvent
 */
class PaymentEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event' => $this->event,
            'status' => $this->status,
            'source' => $this->source,
            'payload' => $this->payload,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
