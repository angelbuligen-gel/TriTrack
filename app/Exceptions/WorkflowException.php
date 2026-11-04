<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when an application, document, or account is not in a state that
 * permits the requested action. Carries the HTTP status and field errors
 * the API should answer with.
 */
class WorkflowException extends RuntimeException
{
    /**
     * @param  array<string, array<int, string>>  $errors
     */
    public function __construct(
        string $message,
        public readonly int $status = 422,
        public readonly array $errors = [],
    ) {
        parent::__construct($message);
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     */
    public static function invalid(string $message, array $errors = []): self
    {
        return new self($message, 422, $errors);
    }

    public static function conflict(string $message, array $errors = []): self
    {
        return new self($message, 409, $errors);
    }

    public static function forbidden(string $message): self
    {
        return new self($message, 403);
    }

    public static function missing(string $message): self
    {
        return new self($message, 404);
    }
}
