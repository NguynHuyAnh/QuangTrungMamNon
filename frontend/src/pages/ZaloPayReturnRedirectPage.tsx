import { Navigate } from 'react-router-dom';

/** Đích cũ `ReturnRedirectUrl` /payment/zalopay/done — chuyển về trang học phí phụ huynh. */
export function ZaloPayReturnRedirectPage() {
  return <Navigate to="/parent/payments?from=zalopay" replace />;
}
