<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Certificate
 */
class CertificateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'certificate_number' => $this->certificate_number,
            'certificate_type' => $this->certificate_type,
            'type_label' => $this->typeLabel(),
            'application' => new ApplicationResource($this->whenLoaded('application')),
            'issued_by' => $this->whenLoaded('issuedBy', fn () => $this->issuedBy?->name),
            'issued_at' => $this->issued_at?->toIso8601String(),
            'metadata' => $this->metadata,
            'download_url' => "/certificates/{$this->id}/download",
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
