import { Navigate, useLocation } from 'react-router-dom';
import { isStaffRole, useAuth } from './AuthContext';

type Props = {
  children: React.ReactElement;
  /** Chỉ tài khoản nội bộ (không phải chỉ Phụ huynh) mới vào được /app */
  requireStaff?: boolean;
};

export function ProtectedRoute({ children, requireStaff }: Props) {
  const { isAuthenticated, roles } = useAuth();
  const loc = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (requireStaff && !isStaffRole(roles)) {
    return <Navigate to="/parent" replace />;
  }

  return children;
}
