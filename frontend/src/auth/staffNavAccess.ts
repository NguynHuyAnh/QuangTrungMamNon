/**
 * Khớp policy trong backend/QuangTrung.Api/Program.cs — dùng để ẩn menu / redirect,
 * tránh Kế toán vào route gọi API trả 403 (vd: ClassesRead, StudentsReadInternal).
 */

export function canStaffAccessCatalogNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin');
}

export function canStaffAccessStudentsNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin');
}

export function canStaffAccessAttendanceNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin' || r === 'PhuHuynh');
}

/** Xuất báo cáo CSV — policy Dashboard.Export (Ban giám hiệu + SuperAdmin). */
export function canExportDashboardReport(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

/** Xem danh sách + tạo tài khoản GV/Kế toán (BGH + SuperAdmin). */
export function canAccessUserDirectory(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

/** Sửa / xóa / đổi role / khóa — chỉ SuperAdmin. */
export function canSuperAdminManageUsers(roles: string[]) {
  return roles.some((r) => r === 'SuperAdmin');
}
