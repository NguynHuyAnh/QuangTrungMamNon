import { Navigate, Route, Routes } from 'react-router-dom';
import { isStaffRole, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { ParentLayout } from './layouts/ParentLayout';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AttendancePage } from './pages/AttendancePage';
import { CatalogPage } from './pages/CatalogPage';
import { DashboardPage } from './pages/DashboardPage';
import { DishesPage } from './pages/DishesPage';
import { MenuPage } from './pages/MenuPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TimetablePage } from './pages/TimetablePage';
import { HealthReportsPage } from './pages/HealthReportsPage';
import { ExternalSubjectsPage } from './pages/ExternalSubjectsPage';
import { StudentLeavePage } from './pages/StudentLeavePage';
import { StaffLeavePage } from './pages/StaffLeavePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { FeeAssignmentsPage } from './pages/FeeAssignmentsPage';
import { FeeStructuresPage } from './pages/FeeStructuresPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ParentAnnouncementsPage } from './pages/parent/ParentAnnouncementsPage';
import { ParentAttendancePage } from './pages/parent/ParentAttendancePage';
import { ParentDashboardPage } from './pages/parent/ParentDashboardPage';
import { ParentMenuPage } from './pages/parent/ParentMenuPage';
import { ParentPaymentsPage } from './pages/parent/ParentPaymentsPage';
import { RegisterParentPage } from './pages/RegisterParentPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { StudentsPage } from './pages/StudentsPage';
import { UsersPage } from './pages/UsersPage';
import { ZaloPayReturnRedirectPage } from './pages/ZaloPayReturnRedirectPage';

function HomeRedirect() {
  const { isAuthenticated, roles } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isStaffRole(roles) ? '/app/dashboard' : '/parent'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/register-parent" element={<RegisterParentPage />} />
      <Route path="/payment/zalopay/done" element={<ZaloPayReturnRedirectPage />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute requireStaff>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="dishes" element={<DishesPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="health" element={<HealthReportsPage />} />
        <Route path="external-subjects" element={<ExternalSubjectsPage />} />
        <Route path="student-leave" element={<StudentLeavePage />} />
        <Route path="staff-leave" element={<StaffLeavePage />} />
        <Route path="fee-structures" element={<FeeStructuresPage />} />
        <Route path="fee-assignments" element={<FeeAssignmentsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
      </Route>

      <Route
        path="/parent"
        element={
          <ProtectedRoute>
            <ParentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboardPage />} />
        <Route path="attendance" element={<ParentAttendancePage />} />
        <Route path="announcements" element={<ParentAnnouncementsPage />} />
        <Route path="menu" element={<ParentMenuPage />} />
        <Route path="payments" element={<ParentPaymentsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
