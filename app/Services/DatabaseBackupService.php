<?php

namespace App\Services;

use App\Models\Application;
use App\Models\User;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Database snapshots for the administrator. SQLite copies the database
 * file; MySQL/MariaDB shells out to mysqldump. Restore is deliberately
 * limited to SQLite in this build and always keeps a pre-restore copy.
 */
class DatabaseBackupService
{
    public function directory(): string
    {
        $directory = storage_path('app/backups');

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        return $directory;
    }

    /**
     * @return array<string, mixed>
     */
    public function create(): array
    {
        $connection = (string) config('database.default');
        $extension = $connection === 'sqlite' ? 'sqlite' : 'sql';
        $name = 'triketrack-'.now()->format('Ymd-His')."-{$connection}.{$extension}";
        $path = $this->directory().DIRECTORY_SEPARATOR.$name;

        if ($connection === 'sqlite') {
            $source = (string) config('database.connections.sqlite.database');

            if (! is_file($source)) {
                throw new RuntimeException('The SQLite database file could not be found.');
            }

            if (! copy($source, $path)) {
                throw new RuntimeException('The database file could not be copied.');
            }
        } elseif (in_array($connection, ['mysql', 'mariadb'], true)) {
            $this->dumpMysql($path, $connection);
        } else {
            throw new RuntimeException("Backups are not supported for the {$connection} driver.");
        }

        return $this->describe($name);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $files = glob($this->directory().DIRECTORY_SEPARATOR.'*') ?: [];

        usort($files, fn (string $a, string $b) => (filemtime($b) ?: 0) <=> (filemtime($a) ?: 0));

        return array_values(array_map(
            fn (string $file) => $this->describe(basename($file)),
            array_filter($files, 'is_file'),
        ));
    }

    public function restore(string $name): array
    {
        $path = $this->safePath($name);
        $connection = (string) config('database.default');

        if ($connection !== 'sqlite') {
            throw new RuntimeException('Restore is only supported for the SQLite database in this build.');
        }

        $handle = fopen($path, 'rb');
        $header = $handle === false ? '' : (string) fread($handle, 16);

        if ($handle !== false) {
            fclose($handle);
        }

        if (! str_starts_with($header, 'SQLite format 3')) {
            throw new RuntimeException('The selected file is not a valid SQLite database.');
        }

        $target = (string) config('database.connections.sqlite.database');

        // Keep a snapshot of the current state before overwriting it.
        $this->create();

        \Illuminate\Support\Facades\DB::disconnect();

        try {
            $copied = copy($path, $target);
        } finally {
            \Illuminate\Support\Facades\DB::reconnect();
        }

        if (! $copied) {
            throw new RuntimeException('The database could not be restored.');
        }

        return $this->describe($name);
    }

    public function delete(string $name): void
    {
        $path = $this->safePath($name);

        if (! unlink($path)) {
            throw new RuntimeException('The backup could not be deleted.');
        }
    }

    public function path(string $name): string
    {
        return $this->safePath($name);
    }

    /**
     * @return array<string, mixed>
     */
    public function health(): array
    {
        $connection = (string) config('database.default');
        $databaseOk = true;
        $databaseError = null;

        try {
            \Illuminate\Support\Facades\DB::select('select 1');
        } catch (\Throwable $exception) {
            $databaseOk = false;
            $databaseError = $exception->getMessage();
        }

        $free = @disk_free_space(storage_path());

        return [
            'app_version' => config('app.version', '1.0.0'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'driver' => $connection,
            'database_ok' => $databaseOk,
            'database_error' => $databaseError,
            'storage_writable' => is_writable(storage_path()),
            'backup_directory_writable' => is_writable($this->directory()),
            'disk_free_bytes' => $free === false ? null : (int) $free,
            'counts' => [
                'users' => \App\Models\User::query()->count(),
                'franchises' => \App\Models\Franchise::query()->count(),
                'applications' => Application::query()->count(),
            ],
        ];
    }

    private function dumpMysql(string $path, string $connection): void
    {
        $config = (array) config("database.connections.{$connection}");
        $binary = (string) env('MYSQLDUMP_PATH', 'mysqldump');

        $command = [
            $binary,
            '--host='.($config['host'] ?? '127.0.0.1'),
            '--port='.($config['port'] ?? '3306'),
            '--user='.($config['username'] ?? 'root'),
            '--single-transaction',
            '--skip-comments',
            (string) ($config['database'] ?? ''),
        ];

        $process = new Process($command);
        $process->setTimeout(300);

        if (! empty($config['password'])) {
            $process->setEnv(['MYSQL_PWD' => (string) $config['password']]);
        }

        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('mysqldump failed: '.trim($process->getErrorOutput() ?: $process->getOutput()));
        }

        if (file_put_contents($path, $process->getOutput()) === false) {
            throw new RuntimeException('The dump could not be written to disk.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function describe(string $name): array
    {
        $path = $this->directory().DIRECTORY_SEPARATOR.$name;
        $size = is_file($path) ? (int) filesize($path) : 0;

        return [
            'name' => $name,
            'size' => $size,
            'size_human' => $this->humanSize($size),
            'created_at' => is_file($path) ? date(DATE_ATOM, (int) filemtime($path)) : null,
        ];
    }

    private function safePath(string $name): string
    {
        if ($name !== basename($name) || preg_match('/^[A-Za-z0-9._-]+$/', $name) !== 1) {
            throw new RuntimeException('Invalid backup name.');
        }

        $path = $this->directory().DIRECTORY_SEPARATOR.$name;

        if (! is_file($path)) {
            throw new RuntimeException('That backup does not exist.');
        }

        return $path;
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1).' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1).' KB';
        }

        return $bytes.' B';
    }
}
