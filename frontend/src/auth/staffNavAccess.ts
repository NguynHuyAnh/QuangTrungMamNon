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

/** Danh mục loại thức ăn — policy Dishes.Write (Ban giám hiệu + SuperAdmin). */
export function canStaffAccessDishesNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

/** Thực đơn hằng ngày — policy Menu.Write (Giáo viên + BGH + SuperAdmin). */
export function canStaffAccessMenuNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin');
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

/** Danh mục môn học (Subjects.Read) — BGH / GV / SuperAdmin. */
export function canStaffAccessSubjectsNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin');
}

/** Thời khóa biểu (Timetable.Read) — mọi staff đã đăng nhập. */
export function canStaffAccessTimetableNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'KeToan' || r === 'SuperAdmin');
}

/** Báo cáo sức khỏe (Health.Read) — BGH / GV / SuperAdmin. */
export function canStaffAccessHealthNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin');
}

/** Môn năng khiếu — staff (BGH/GV/KeToan/SuperAdmin xem được; PH có route riêng). */
export function canStaffAccessExternalSubjectsNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'KeToan' || r === 'SuperAdmin');
}

/** Đơn nghỉ phép học sinh (StudentLeave.Read) — BGH / GV / SuperAdmin. */
export function canStaffAccessStudentLeaveNav(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'GiaoVien' || r === 'SuperAdmin');
}

/** Đơn nghỉ phép giáo viên (StaffLeave.Read) — GV / KeToan / BGH / SuperAdmin. */
export function canStaffAccessStaffLeaveNav(roles: string[]) {
  return roles.some((r) => r === 'GiaoVien' || r === 'KeToan' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}
