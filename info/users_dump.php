<?php
chdir(__DIR__ . '/..');
require __DIR__ . '/../vendor/autoload.php';

$dbPath = getcwd() . '/database/database.sqlite';
if (!file_exists($dbPath)) {
    echo 'DB not found at ' . $dbPath . PHP_EOL;
    exit(1);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->query(
    'SELECT id, name, email, mobile_number, role, account_status, created_at
     FROM users
     ORDER BY id'
);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($users as $u) {
    echo 'ID: ' . $u['id']
        . ' | Name: ' . $u['name']
        . ' | Email: ' . $u['email']
        . ' | Mobile: ' . $u['mobile_number']
        . ' | Role: ' . $u['role']
        . ' | Status: ' . $u['account_status']
        . ' | Created: ' . $u['created_at']
        . PHP_EOL;
}
