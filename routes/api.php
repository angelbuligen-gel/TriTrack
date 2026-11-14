<?php

use App\Http\Controllers\Api\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Api\Admin\BackupController as AdminBackupController;
use App\Http\Controllers\Api\Admin\NotificationTemplateController as AdminNotificationTemplateController;
use App\Http\Controllers\Api\Admin\DocumentRequirementController as AdminDocumentRequirementController;
use App\Http\Controllers\Api\Admin\DocumentTemplateController as AdminDocumentTemplateController;
use App\Http\Controllers\Api\Admin\FeeTypeController as AdminFeeTypeController;
use App\Http\Controllers\Api\Admin\MonitoringController;
use App\Http\Controllers\Api\Admin\SessionController as AdminSessionController;
use App\Http\Controllers\Api\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Bplo\ApplicationController as BploApplicationController;
use App\Http\Controllers\Api\Bplo\CertificateController as BploCertificateController;
use App\Http\Controllers\Api\Bplo\DocumentReviewController;
use App\Http\Controllers\Api\Bplo\DriverController;
use App\Http\Controllers\Api\Bplo\FranchiseController;
use App\Http\Controllers\Api\Bplo\FranchiseeController;
use App\Http\Controllers\Api\Bplo\FranchiseeNotificationController;
use App\Http\Controllers\Api\Bplo\RecordReportController as BploRecordReportController;
use App\Http\Controllers\Api\Bplo\ReportController as BploReportController;
use App\Http\Controllers\Api\Bplo\VehicleController;
use App\Http\Controllers\Api\CertificateDownloadController;
use App\Http\Controllers\Api\DocumentFileController;
use App\Http\Controllers\Api\MyApplicationController;
use App\Http\Controllers\Api\MyCertificateController;
use App\Http\Controllers\Api\MyFranchiseController;
use App\Http\Controllers\Api\MyPaymentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentReceiptController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\Treasury\ApplicationController as TreasuryApplicationController;
use App\Http\Controllers\Api\Treasury\AssessmentController as TreasuryAssessmentController;
use App\Http\Controllers\Api\Treasury\PaymentController as TreasuryPaymentController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ApiResponse::success([
    'service' => 'TrikeTrack API',
    'version' => '1.0.0',
], 'API is running.'));

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:15,1');
    Route::post('resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

/*
|--------------------------------------------------------------------------
| Payments webhook (provider -> server)
|--------------------------------------------------------------------------
*/
Route::post('payments/webhook/{provider}', [PaymentWebhookController::class, 'handle'])
    ->middleware('throttle:120,1');

/*
|--------------------------------------------------------------------------
| Shared authenticated endpoints (all roles)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'updatePassword']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::get('certificates/{certificate}/download', CertificateDownloadController::class);
    Route::get('documents/{document}/file', DocumentFileController::class);
    Route::get('payments/{payment}/receipt', PaymentReceiptController::class);
});

/*
|--------------------------------------------------------------------------
| Franchisee self-service
|--------------------------------------------------------------------------
|
| Scoped to the signed-in franchisee's own records on the server side.
|
*/
Route::prefix('my')
    ->middleware(['auth:sanctum', 'role:franchisee'])
    ->group(function () {
        Route::get('profile', [MyFranchiseController::class, 'profile']);
        Route::get('franchise', [MyFranchiseController::class, 'index']);
        Route::get('drivers', [MyFranchiseController::class, 'drivers']);
        Route::post('drivers', [MyFranchiseController::class, 'storeDriver']);
        Route::put('drivers/{driver}', [MyFranchiseController::class, 'updateDriver']);
        Route::delete('drivers/{driver}', [MyFranchiseController::class, 'archiveDriver']);
        Route::get('vehicles', [MyFranchiseController::class, 'vehicles']);

        Route::get('applications', [MyApplicationController::class, 'index']);
        Route::get('renewal-options', [MyApplicationController::class, 'renewalOptions']);
        Route::post('applications/renewal', [MyApplicationController::class, 'storeRenewal']);
        Route::get('transfer-options', [MyApplicationController::class, 'transferOptions']);
        Route::post('applications/transfer', [MyApplicationController::class, 'storeTransfer']);
        Route::get('change-motor-options', [MyApplicationController::class, 'changeMotorOptions']);
        Route::post('applications/change-motor', [MyApplicationController::class, 'storeChangeMotor']);
        Route::get('applications/{application}', [MyApplicationController::class, 'show']);
        Route::post('applications/{application}/documents', [MyApplicationController::class, 'storeDocument']);
        Route::get('documents', [MyApplicationController::class, 'documents']);
        Route::get('documents/{document}/file', [MyApplicationController::class, 'documentFile']);

        Route::get('payments', [MyPaymentController::class, 'index']);
        Route::post('payments/initiate', [MyPaymentController::class, 'initiate']);
        Route::get('payments/{payment}', [MyPaymentController::class, 'show']);

        Route::get('certificates', [MyCertificateController::class, 'index']);
    });

/*
|--------------------------------------------------------------------------
| BPLO personnel
|--------------------------------------------------------------------------
|
| BPLO and the administrator may manage franchise records.
|
*/
Route::prefix('bplo')
    ->middleware(['auth:sanctum', 'role:bplo,administrator'])
    ->group(function () {
        Route::get('franchisees', [FranchiseeController::class, 'index']);
        Route::get('franchisee-accounts', [FranchiseeController::class, 'accounts']);
        Route::post('franchisees', [FranchiseeController::class, 'store']);
        Route::get('franchisees/{franchisee}', [FranchiseeController::class, 'show']);
        Route::put('franchisees/{franchisee}', [FranchiseeController::class, 'update']);
        Route::post('franchisees/{franchisee}/notifications', [FranchiseeNotificationController::class, 'store']);
        Route::post('franchisees/{franchisee}/link-account', [FranchiseeController::class, 'linkAccount']);
        Route::delete('franchisees/{franchisee}/link-account', [FranchiseeController::class, 'unlinkAccount']);

        Route::get('franchises', [FranchiseController::class, 'index']);
        Route::post('franchises', [FranchiseController::class, 'store']);
        Route::get('franchises/{franchise}', [FranchiseController::class, 'show']);
        Route::put('franchises/{franchise}', [FranchiseController::class, 'update']);
        Route::post('franchises/{franchise}/drivers', [FranchiseController::class, 'assignDriver']);
        Route::delete('franchises/{franchise}/drivers/{assignment}', [FranchiseController::class, 'endDriverAssignment']);
        Route::post('franchises/{franchise}/vehicles', [FranchiseController::class, 'assignVehicle']);
        Route::delete('franchises/{franchise}/vehicles/{assignment}', [FranchiseController::class, 'endVehicleAssignment']);

        Route::get('drivers', [DriverController::class, 'index']);
        Route::post('drivers', [DriverController::class, 'store']);
        Route::get('drivers/{driver}', [DriverController::class, 'show']);
        Route::put('drivers/{driver}', [DriverController::class, 'update']);

        Route::get('applications/stats', [BploApplicationController::class, 'stats']);
        Route::get('applications', [BploApplicationController::class, 'index']);
        Route::get('applications/{application}', [BploApplicationController::class, 'show']);
        Route::post('applications/{application}/start-review', [BploApplicationController::class, 'startReview']);
        Route::post('applications/{application}/request-correction', [BploApplicationController::class, 'requestCorrection']);
        Route::post('applications/{application}/decision', [BploApplicationController::class, 'decide']);
        Route::get('applications/{application}/form', [BploApplicationController::class, 'form']);

        Route::get('documents', [DocumentReviewController::class, 'index']);
        Route::post('documents/{document}/review', [DocumentReviewController::class, 'review']);
        Route::post('documents/{document}/extract', [DocumentReviewController::class, 'extract']);
        Route::post('documents/{document}/confirm-extraction', [DocumentReviewController::class, 'confirmExtraction']);
        Route::get('documents/{document}/file', [DocumentReviewController::class, 'file']);

        Route::get('certificates', [BploCertificateController::class, 'index']);
        Route::get('certificates/{certificate}', [BploCertificateController::class, 'show']);
        Route::post('applications/{application}/certificate', [BploCertificateController::class, 'issue']);
        Route::get('certificates/{certificate}/pdf', [BploCertificateController::class, 'download']);

        Route::get('reports/summary', [BploReportController::class, 'summary']);
        Route::get('reports/applications', [BploReportController::class, 'applications']);
        Route::get('reports/applications/pdf', [BploReportController::class, 'applicationsPdf']);
        Route::get('reports/applications/excel', [BploReportController::class, 'applicationsExcel']);
        Route::get('reports/records/{report}', [BploRecordReportController::class, 'show']);
        Route::get('reports/records/{report}/export', [BploRecordReportController::class, 'export']);
        Route::post('reports/renewal-reminders', [BploRecordReportController::class, 'sendReminders']);

        Route::get('vehicles', [VehicleController::class, 'index']);
        Route::post('vehicles', [VehicleController::class, 'store']);
        Route::get('vehicles/{vehicle}', [VehicleController::class, 'show']);
        Route::put('vehicles/{vehicle}', [VehicleController::class, 'update']);
    });

/*
|--------------------------------------------------------------------------
| Treasury personnel
|--------------------------------------------------------------------------
| Administrator has read access for oversight; only treasury may assess
| fees and verify payments.
|
*/
Route::prefix('treasury')
    ->middleware(['auth:sanctum', 'role:treasury,administrator'])
    ->group(function () {
        Route::get('dashboard', [TreasuryApplicationController::class, 'stats']);
        Route::get('fee-types', [TreasuryApplicationController::class, 'feeTypes']);
        Route::get('applications', [TreasuryApplicationController::class, 'index']);
        Route::get('applications/{application}', [TreasuryApplicationController::class, 'show']);

        Route::get('assessments', [TreasuryAssessmentController::class, 'index']);
        Route::get('assessments/{assessment}', [TreasuryAssessmentController::class, 'show']);
        Route::get('applications/{application}/fee-types', [TreasuryAssessmentController::class, 'feeTypes']);

        Route::get('payments', [TreasuryPaymentController::class, 'index']);
        Route::get('payments/{payment}', [TreasuryPaymentController::class, 'show']);
        Route::get('reports/collections', [TreasuryPaymentController::class, 'report']);
        Route::get('reports/collections/pdf', [TreasuryPaymentController::class, 'reportPdf']);
        Route::get('reports/collections/excel', [TreasuryPaymentController::class, 'reportExcel']);

        Route::middleware('role:treasury')->group(function () {
            Route::post('applications/{application}/assessment', [TreasuryAssessmentController::class, 'store']);
            Route::delete('assessments/{assessment}', [TreasuryAssessmentController::class, 'cancel']);
            Route::post('payments/{payment}/verify', [TreasuryPaymentController::class, 'verify']);
        });
    });

/*
|--------------------------------------------------------------------------
| Administrator
|--------------------------------------------------------------------------
*/
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:administrator'])
    ->group(function () {
        Route::get('users', [AdminUserController::class, 'index']);
        Route::post('users', [AdminUserController::class, 'store']);
        Route::get('users/{user}', [AdminUserController::class, 'show']);
        Route::put('users/{user}', [AdminUserController::class, 'update']);
        Route::patch('users/{user}/status', [AdminUserController::class, 'updateStatus']);
        Route::post('users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);

        Route::get('sessions', [AdminSessionController::class, 'index']);
        Route::delete('sessions/{token}', [AdminSessionController::class, 'destroy']);
        Route::delete('users/{user}/sessions', [AdminSessionController::class, 'destroyForUser']);

        Route::get('fee-types', [AdminFeeTypeController::class, 'index']);
        Route::post('fee-types', [AdminFeeTypeController::class, 'store']);
        Route::put('fee-types/{feeType}', [AdminFeeTypeController::class, 'update']);
        Route::delete('fee-types/{feeType}', [AdminFeeTypeController::class, 'destroy']);

        Route::get('document-templates', [AdminDocumentTemplateController::class, 'index']);
        Route::put('document-templates/{documentTemplate}', [AdminDocumentTemplateController::class, 'update']);
        Route::post('document-templates/{documentTemplate}/asset', [AdminDocumentTemplateController::class, 'uploadAsset']);
        Route::post('document-templates/{documentTemplate}/restore', [AdminDocumentTemplateController::class, 'restore']);
        Route::get('document-templates/{documentTemplate}/preview', [AdminDocumentTemplateController::class, 'preview']);

        Route::get('notification-templates', [AdminNotificationTemplateController::class, 'index']);
        Route::put('notification-templates/{notificationTemplate}', [AdminNotificationTemplateController::class, 'update']);

        Route::get('backups', [AdminBackupController::class, 'index']);
        Route::post('backups', [AdminBackupController::class, 'store']);
        Route::post('backups/{backup}/restore', [AdminBackupController::class, 'restore']);
        Route::get('backups/{backup}/download', [AdminBackupController::class, 'download']);
        Route::delete('backups/{backup}', [AdminBackupController::class, 'destroy']);

        Route::get('document-requirements', [AdminDocumentRequirementController::class, 'index']);
        Route::post('document-requirements', [AdminDocumentRequirementController::class, 'store']);
        Route::put('document-requirements/{documentRequirement}', [AdminDocumentRequirementController::class, 'update']);
        Route::delete('document-requirements/{documentRequirement}', [AdminDocumentRequirementController::class, 'destroy']);

        Route::get('activity-logs', [AdminActivityLogController::class, 'index']);

        Route::get('settings', [AdminSettingController::class, 'index']);
        Route::put('settings', [AdminSettingController::class, 'update']);

        Route::get('monitoring', MonitoringController::class);
    });
