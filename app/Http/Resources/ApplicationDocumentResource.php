<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ApplicationDocument
 */
class ApplicationDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'requirement_code' => $this->requirement_code,
            'document_type' => $this->document_type,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'human_size' => $this->humanSize(),
            'uploaded_at' => $this->uploaded_at?->toIso8601String(),
            'uploaded_by' => $this->uploadedBy?->name,
            'review_status' => $this->review_status,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'reviewed_by' => $this->reviewedBy?->name,
            'review_remarks' => $this->review_remarks,
            'ml_status' => $this->ml_status,
            'ml_document_type' => $this->ml_document_type,
            'ml_extracted' => $this->ml_extracted,
            'ml_confidence' => $this->ml_confidence,
            'ml_processed_at' => $this->ml_processed_at?->toIso8601String(),
            'ml_error' => $this->ml_error,
            'ml_verified_at' => $this->ml_verified_at?->toIso8601String(),
            'ml_verified_by' => $this->whenLoaded('mlVerifiedBy', fn () => $this->mlVerifiedBy?->name),
            'ml_review_remarks' => $this->ml_review_remarks,
            'file_url' => "/documents/{$this->id}/file",
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
