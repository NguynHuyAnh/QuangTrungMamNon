import { Navigate, Route, Routes } from 'react-router-dom';
import { isStaffRole, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { ParentLayout } from './layouts/ParentLayout';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AttendancePage } from './pages/AttendancePage';
import { CatalogPage } from './pages/CatalogPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { FeeAssignmentsPage } from './pages/FeeAssignmentsPage';
import { FeeStructuresPage } from './pages/FeeStructuresPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ParentAnnouncementsPage } from './pages/parent/ParentAnnouncementsPage';
import { ParentAttendancePage } from './pages/parent/ParentAttendancePage';
import { ParentDashboardPage } from './pages/parent/ParentDashboardPage';
import { ParentPaymentsPage } from './pages/parent/ParentPaymentsPage';
import { RegisterParentPage } from './pages/RegisterParentPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { StudentsPage } from './pages/StudentsPage';
import { UsersPage } from './pages/UsersPage';
import { ZaloPayReturnRedirectPage } from './pages/ZaloPayReturnRedirectPage';
import { TimetablePage } from './pages/TimetablePage';
import { FoodDeclaration } from './pages/FoodDeclaration.tsx';
import { SubjectPage } from './pages/SubjectPage';
import { TeacherMenuPage } from './pages/TeacherMenuPage';
import { ParentMenuPage } from './pages/ParentMenuPage';
import { ParentLeavePage } from './pages/ParentLeavePage';
import { TeacherLeavePage } from './pages/TeacherLeavePage';
import { PrincipalLeavePage } from './pages/PrincipalLeavePage';
import { TeacherExtraSubjectPage } from './pages/TeacherExtraSubjectPage';
import { ParentExtraSubjectPage } from './pages/ParentExtraSubjectPage';

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
        <Route path="subjects" element={<SubjectPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="teacher-menu" element={<TeacherMenuPage />} />
        <Route path="teacher-leave" element={<TeacherLeavePage />} />
        <Route path="principal-leave" element={<PrincipalLeavePage />} />
        <Route path="parent-extra-subjects" element={<ParentExtraSubjectPage />} />
        <Route path="teacher-extra-subjects" element={<TeacherExtraSubjectPage />} />
        <Route path="parent-leave" element={<ParentLeavePage />} />
        <Route path="parent-menu" element={<ParentMenuPage />} />
        <Route path="food-declaration" element={<FoodDeclaration />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
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
        <Route path="payments" element={<ParentPaymentsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}


