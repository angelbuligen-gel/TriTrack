<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\StreamsApplicationDocuments;
use App\Http\Controllers\Controller;
use App\Models\ApplicationDocument;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Single authenticated endpoint for document previews. The owning
 * franchisee and all staff roles may read a document; nobody else can.
 */
class DocumentFileController extends Controller
{
    use StreamsApplicationDocuments;

    public function __invoke(Request $request, ApplicationDocument $document): Response
    {
        $user = $request->user();

        $isStaff = $user instanceof User && $user->hasRole(
            User::ROLE_BPLO,
            User::ROLE_TREASURY,
            User::ROLE_ADMINISTRATOR,
        );

        if (! $isStaff) {
            $document->loadMissing('application.franchisee');
            $ownsDocument = $user instanceof User
                && $document->application?->franchisee?->user_id === $user->id;

            abort_unless($ownsDocument, 403, 'You may only view documents you submitted.');
        }

        return $this->documentResponse($document, $request);
    }
}
