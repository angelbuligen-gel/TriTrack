<?php

namespace App\Services;

use App\Exceptions\WorkflowException;
use App\Models\Application;
use App\Models\Assessment;
use App\Models\AssessmentItem;
use App\Models\FeeType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AssessmentService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogger $activity,
    ) {}

    /**
     * Create or replace a pending assessment for an application. Paid
     * assessments can never be changed.
     *
     * @param  array<int, array<string, mixed>>|null  $items
     */
    public function assess(Application $application, User $user, ?array $items = null, ?string $remarks = null): Assessment
    {
        if (in_array($application->status, [Application::STATUS_REJECTED, Application::STATUS_CANCELLED], true)) {
            throw WorkflowException::conflict('A rejected or cancelled application cannot be assessed.');
        }

        $existing = $application->assessment()->first();

        if ($existing?->isPaid()) {
            throw WorkflowException::conflict('This assessment has already been paid and can no longer be changed.');
        }

        $items = $items === null || $items === []
            ? $this->defaultItems($application)
            : $items;

        if ($items === []) {
            throw WorkflowException::invalid('Add at least one fee item to the assessment.');
        }

        return DB::transaction(function () use ($application, $user, $items, $remarks, $existing) {
            $assessment = $existing ?? new Assessment([
                'application_id' => $application->id,
                'assessment_number' => $this->nextNumber(),
            ]);

            $assessment->fill([
                'assessed_by' => $user->id,
                'assessed_at' => now(),
                'status' => Assessment::STATUS_PENDING,
                'remarks' => $remarks,
            ]);

            $assessment->total_amount = collect($items)->sum(fn (array $item) => (float) $item['amount']);
            $assessment->save();

            $assessment->items()->delete();

            foreach ($items as $item) {
                AssessmentItem::create([
                    'assessment_id' => $assessment->id,
                    'fee_type_id' => $item['fee_type_id'] ?? null,
                    'description' => $item['description']
                        ?? FeeType::find($item['fee_type_id'] ?? null)?->name
                        ?? 'Franchise fee',
                    'amount' => $item['amount'],
                ]);
            }

            $this->activity->log(
                'assessment.saved',
                "Assessment {$assessment->assessment_number} saved for {$application->reference_number}.",
                $user,
                $assessment,
            );

            $this->notifications->notifyApplicationEvent(
                $application,
                'payment_instructions',
                ['amount' => number_format((float) $assessment->total_amount, 2)],
            );

            return $assessment->fresh()->load('items.feeType');
        });
    }

    public function cancel(Assessment $assessment, User $user): Assessment
    {
        if ($assessment->isPaid()) {
            throw WorkflowException::conflict('A paid assessment cannot be cancelled.');
        }

        $assessment->update(['status' => Assessment::STATUS_CANCELLED]);
        $this->activity->log('assessment.cancelled', "Assessment {$assessment->assessment_number} cancelled.", $user, $assessment);

        return $assessment->fresh();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultItems(Application $application): array
    {
        return FeeType::query()
            ->forType($application->application_type)
            ->get()
            ->map(fn (FeeType $fee) => [
                'fee_type_id' => $fee->id,
                'description' => $fee->name,
                'amount' => $fee->amount,
            ])
            ->all();
    }

    private function nextNumber(): string
    {
        $year = now()->year;
        $latest = Assessment::query()
            ->where('assessment_number', 'like', "ASM-{$year}-%")
            ->orderByDesc('id')
            ->value('assessment_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, -4)) + 1;

        return sprintf('ASM-%d-%04d', $year, $sequence);
    }
}
