<?php

namespace App\Contracts;

interface SmsSender
{
    /**
     * Deliver a plain-text SMS to a Philippine mobile number.
     *
     * @param  string  $mobileNumber  Canonical number in +639XXXXXXXXX format.
     *
     * @throws \App\Exceptions\SmsDeliveryException
     */
    public function send(string $mobileNumber, string $message): void;
}
