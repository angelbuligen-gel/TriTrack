<?php

namespace App\Exceptions;

use RuntimeException;

class SmsDeliveryException extends RuntimeException
{
    public static function rejected(string $reason = 'The SMS gateway rejected the message.'): self
    {
        return new self($reason);
    }

    public static function unreachable(): self
    {
        return new self('The SMS gateway could not be reached. Please try again.');
    }

    public static function notConfigured(): self
    {
        return new self('SMS delivery is not configured. Please contact the administrator.');
    }
}
