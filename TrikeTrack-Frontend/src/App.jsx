import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import ActivityLogsPage from './pages/admin/ActivityLogsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import BackupPage from './pages/admin/BackupPage'
import FeeManagementPage from './pages/admin/FeeManagementPage'
import NotificationTemplatesPage from './pages/admin/NotificationTemplatesPage'
import RequirementManagementPage from './pages/admin/RequirementManagementPage'
import SessionsPage from './pages/admin/SessionsPage'
import TemplateManagementPage from './pages/admin/TemplateManagementPage'
import SystemConfigurationPage from './pages/admin/SystemConfigurationPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import RegistrationSuccessPage from './pages/auth/RegistrationSuccessPage'
import VerifyOtpPage from './pages/auth/VerifyOtpPage'
import BploDashboardPage from './pages/bplo/DashboardPage'
import CertificateManagementPage from './pages/bplo/CertificateManagementPage'
import ChangeMotorManagementPage from './pages/bplo/ChangeMotorManagementPage'
import DocumentReviewPage from './pages/bplo/DocumentReviewPage'
import DriverManagementPage from './pages/bplo/DriverManagementPage'
import FranchiseManagementPage from './pages/bplo/FranchiseManagementPage'
import FranchiseeManagementPage from './pages/bplo/FranchiseeManagementPage'
import RecordReportsPage from './pages/bplo/RecordReportsPage'
import RenewalManagementPage from './pages/bplo/RenewalManagementPage'
import ReportsPage from './pages/bplo/ReportsPage'
import TransferManagementPage from './pages/bplo/TransferManagementPage'
import ApplicationsPage from './pages/franchisee/ApplicationsPage'
import CertificatesPage from './pages/franchisee/CertificatesPage'
import ChangeMotorPage from './pages/franchisee/ChangeMotorPage'
import DashboardPage from './pages/franchisee/DashboardPage'
import DocumentsPage from './pages/franchisee/DocumentsPage'
import DriversPage from './pages/franchisee/DriversPage'
import NotificationsPage from './pages/franchisee/NotificationsPage'
import PaymentsPage from './pages/franchisee/PaymentsPage'
import ProfilePage from './pages/franchisee/ProfilePage'
import RenewalPage from './pages/franchisee/RenewalPage'
import TransferPage from './pages/franchisee/TransferPage'
import DashboardPreviewPage from './pages/DashboardPreviewPage'
import NotFoundPage from './pages/NotFoundPage'
import SaasDashboardPage from './pages/SaasDashboardPage'
import AssessmentsPage from './pages/treasury/AssessmentsPage'
import CollectionReportsPage from './pages/treasury/CollectionReportsPage'
import PaymentVerificationPage from './pages/treasury/PaymentVerificationPage'
import TreasuryDashboardPage from './pages/treasury/TreasuryDashboardPage'
import GuestRoute from './routes/GuestRoute'
import ProtectedRoute from './routes/ProtectedRoute'
import useAuth from './hooks/useAuth'
import { homeRouteForRole } from './utils/roles'

function HomeRedirect() {
  const { user, initialising } = useAuth()

  if (initialising) {
    return (
      <div className="page-loader" role="status" aria-live="polite">
        <span className="btn__spinner" aria-hidden="true" />
        Loading...
      </div>
    )
  }

  return <Navigate to={user ? homeRouteForRole(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<GuestRoute />}>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/register/success" element={<RegistrationSuccessPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['franchisee']} />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="app" element={<DashboardPage />} />
          <Route path="renewal" element={<RenewalPage />} />
          <Route path="transfer" element={<TransferPage />} />
          <Route path="change-motor" element={<ChangeMotorPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="my-drivers" element={<DriversPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['bplo', 'administrator']} />}>
        <Route element={<AppLayout />}>
          <Route index element={<BploDashboardPage />} />
          <Route path="bplo" element={<BploDashboardPage />} />
          <Route path="franchises" element={<FranchiseManagementPage />} />
          <Route path="franchisees" element={<FranchiseeManagementPage />} />
          <Route path="drivers" element={<DriverManagementPage />} />
          <Route path="renewals" element={<RenewalManagementPage />} />
          <Route path="transfers" element={<TransferManagementPage />} />
          <Route path="change-motor" element={<ChangeMotorManagementPage />} />
          <Route path="documents" element={<DocumentReviewPage />} />
          <Route path="certificates" element={<CertificateManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="record-reports" element={<RecordReportsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['treasury', 'administrator']} />}>
        <Route element={<AppLayout />}>
          <Route index element={<TreasuryDashboardPage />} />
          <Route path="treasury" element={<TreasuryDashboardPage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="payments" element={<PaymentVerificationPage />} />
          <Route path="reports" element={<CollectionReportsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['administrator']} />}>
        <Route element={<AppLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<SystemConfigurationPage />} />
          <Route path="fees" element={<FeeManagementPage />} />
          <Route path="requirements" element={<RequirementManagementPage />} />
          <Route path="templates" element={<TemplateManagementPage />} />
          <Route path="notification-templates" element={<NotificationTemplatesPage />} />
          <Route path="backups" element={<BackupPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
        </Route>
      </Route>

      <Route path="dashboard-preview" element={<DashboardPreviewPage />} />
      <Route path="dashboard-saas" element={<SaasDashboardPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
