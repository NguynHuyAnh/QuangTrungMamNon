// API + types cho các tính năng: Môn học, Thời khóa biểu, Sức khỏe, Môn năng khiếu,
// Đơn nghỉ phép học sinh & giáo viên. Khớp DTO ở backend/QuangTrung.Api/Controllers/*.
import { authHeader, authJson, fetchJson, type PagedResult } from './client';

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ===================== Nhãn enum dùng chung =====================
export const LEAVE_STATUS = [
  { value: 0, label: 'Chờ duyệt' },
  { value: 1, label: 'Đã duyệt' },
  { value: 2, label: 'Từ chối' },
  { value: 3, label: 'Đã hủy' },
] as const;
export function leaveStatusLabel(v: number): string {
  return LEAVE_STATUS.find((x) => x.value === v)?.label ?? `Trạng thái ${v}`;
}

export const STAFF_LEAVE_TYPE = [
  { value: 0, label: 'Phép năm' },
  { value: 1, label: 'Nghỉ bệnh' },
  { value: 2, label: 'Việc riêng' },
  { value: 3, label: 'Không lương' },
  { value: 4, label: 'Khác' },
] as const;
export function staffLeaveTypeLabel(v: number): string {
  return STAFF_LEAVE_TYPE.find((x) => x.value === v)?.label ?? `Loại ${v}`;
}

export const ENROLLMENT_STATUS = [
  { value: 0, label: 'Đang học' },
  { value: 1, label: 'Tạm ngừng' },
  { value: 2, label: 'Đã hủy' },
] as const;
export function enrollmentStatusLabel(v: number): string {
  return ENROLLMENT_STATUS.find((x) => x.value === v)?.label ?? `Trạng thái ${v}`;
}

export const FEE_PAYMENT_STATUS = [
  { value: 0, label: 'Chưa đóng' },
  { value: 1, label: 'Đã đóng' },
] as const;
export function feePaymentStatusLabel(v: number): string {
  return FEE_PAYMENT_STATUS.find((x) => x.value === v)?.label ?? `Trạng thái ${v}`;
}

export const DAY_OF_WEEK = [
  { value: 2, label: 'Thứ Hai' },
  { value: 3, label: 'Thứ Ba' },
  { value: 4, label: 'Thứ Tư' },
  { value: 5, label: 'Thứ Năm' },
  { value: 6, label: 'Thứ Sáu' },
  { value: 7, label: 'Thứ Bảy' },
  { value: 8, label: 'Chủ Nhật' },
] as const;
export function dayOfWeekLabel(v: number): string {
  return DAY_OF_WEEK.find((x) => x.value === v)?.label ?? `Thứ ${v}`;
}

// ===================== Môn học chính khóa =====================
export type SubjectRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  colorCode?: string | null;
  isActive: boolean;
};
export type UpsertSubjectBody = {
  code: string;
  name: string;
  description?: string | null;
  colorCode?: string | null;
  isActive: boolean;
};

export function getSubjects(
  accessToken: string,
  params: { q?: string; activeOnly?: boolean; page?: number; pageSize?: number } = {},
): Promise<PagedResult<SubjectRow>> {
  return fetchJson(`/api/subjects${qs(params)}`, { headers: authHeader(accessToken) });
}
export function createSubject(accessToken: string, body: UpsertSubjectBody): Promise<{ id: string }> {
  return fetchJson('/api/subjects', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function updateSubject(accessToken: string, id: string, body: UpsertSubjectBody): Promise<void> {
  return fetchJson(`/api/subjects/${id}`, { method: 'PUT', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function deleteSubject(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/subjects/${id}`, { method: 'DELETE', headers: authHeader(accessToken) });
}

// ===================== Thời khóa biểu =====================
export type TimetableSlotRow = {
  id: string;
  schoolYearId: string;
  classId: string;
  dayOfWeek: number;
  slotNo: number;
  subjectId: string;
  subjectName: string;
  subjectColor?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  startTime?: string | null; // "07:30:00"
  endTime?: string | null;
  room?: string | null;
  note?: string | null;
};
export type UpsertTimetableSlotBody = {
  schoolYearId: string;
  classId: string;
  dayOfWeek: number;
  slotNo: number;
  subjectId: string;
  teacherId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  note?: string | null;
};

export function getTimetable(
  accessToken: string,
  classId: string,
  schoolYearId: string,
): Promise<TimetableSlotRow[]> {
  return fetchJson(`/api/class-timetables${qs({ classId, schoolYearId })}`, { headers: authHeader(accessToken) });
}
export function createTimetableSlot(accessToken: string, body: UpsertTimetableSlotBody): Promise<{ id: string }> {
  return fetchJson('/api/class-timetables', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function updateTimetableSlot(accessToken: string, id: string, body: UpsertTimetableSlotBody): Promise<void> {
  return fetchJson(`/api/class-timetables/${id}`, { method: 'PUT', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function deleteTimetableSlot(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/class-timetables/${id}`, { method: 'DELETE', headers: authHeader(accessToken) });
}

// ===================== Báo cáo sức khỏe =====================
export type HealthReportRow = {
  id: string;
  studentId: string;
  studentName: string;
  reportDate: string;
  height?: number | null;
  weight?: number | null;
  temperature?: number | null;
  heartRate?: number | null;
  bloodPressure?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  medication?: string | null;
  doctorNote?: string | null;
  parentNotified: boolean;
  createdByName: string;
  createdAt: string;
};
export type UpsertHealthReportBody = {
  studentId: string;
  reportDate: string;
  height?: number | null;
  weight?: number | null;
  temperature?: number | null;
  heartRate?: number | null;
  bloodPressure?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  medication?: string | null;
  doctorNote?: string | null;
  parentNotified: boolean;
};

export function getHealthReports(
  accessToken: string,
  params: { studentId?: string; from?: string; to?: string; page?: number; pageSize?: number } = {},
): Promise<PagedResult<HealthReportRow>> {
  return fetchJson(`/api/health-reports${qs(params)}`, { headers: authHeader(accessToken) });
}
export function createHealthReport(accessToken: string, body: UpsertHealthReportBody): Promise<{ id: string }> {
  return fetchJson('/api/health-reports', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function updateHealthReport(accessToken: string, id: string, body: UpsertHealthReportBody): Promise<void> {
  return fetchJson(`/api/health-reports/${id}`, { method: 'PUT', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function deleteHealthReport(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/health-reports/${id}`, { method: 'DELETE', headers: authHeader(accessToken) });
}

// ===================== Môn năng khiếu =====================
export type ExternalSubjectRow = {
  id: string;
  code: string;
  name: string;
  teacherId?: string | null;
  teacherName?: string | null;
  feeAmount?: number | null;
  maxStudents?: number | null;
  activeCount: number;
  isActive: boolean;
  note?: string | null;
};
export type UpsertExternalSubjectBody = {
  code: string;
  name: string;
  teacherId?: string | null;
  feeAmount?: number | null;
  maxStudents?: number | null;
  isActive: boolean;
  note?: string | null;
};
export type EnrollmentRow = {
  id: string;
  studentId: string;
  studentName: string;
  externalSubjectId: string;
  externalSubjectName: string;
  feeAmount?: number | null;
  enrollDate: string;
  withdrawDate?: string | null;
  status: number;
  paymentStatus: number;
  paidAt?: string | null;
  collectedByName?: string | null;
};

export function getExternalSubjects(
  accessToken: string,
  params: { q?: string; activeOnly?: boolean; page?: number; pageSize?: number } = {},
): Promise<PagedResult<ExternalSubjectRow>> {
  return fetchJson(`/api/external-subjects${qs(params)}`, { headers: authHeader(accessToken) });
}
export function createExternalSubject(accessToken: string, body: UpsertExternalSubjectBody): Promise<{ id: string }> {
  return fetchJson('/api/external-subjects', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function updateExternalSubject(accessToken: string, id: string, body: UpsertExternalSubjectBody): Promise<void> {
  return fetchJson(`/api/external-subjects/${id}`, { method: 'PUT', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function deleteExternalSubject(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/external-subjects/${id}`, { method: 'DELETE', headers: authHeader(accessToken) });
}
export function getEnrollments(
  accessToken: string,
  params: { externalSubjectId?: string; studentId?: string; status?: number; paymentStatus?: number; page?: number; pageSize?: number } = {},
): Promise<PagedResult<EnrollmentRow>> {
  return fetchJson(`/api/external-subjects/enrollments${qs(params)}`, { headers: authHeader(accessToken) });
}
export function enrollStudent(
  accessToken: string,
  body: { studentId: string; externalSubjectId: string; enrollDate: string },
): Promise<{ id: string }> {
  return fetchJson('/api/external-subjects/enrollments', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function withdrawEnrollment(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/external-subjects/enrollments/${id}/withdraw`, { method: 'POST', headers: authHeader(accessToken) });
}
export function collectEnrollmentFee(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/external-subjects/enrollments/${id}/collect-fee`, { method: 'POST', headers: authHeader(accessToken) });
}

// ===================== Đơn nghỉ phép học sinh =====================
export type StudentLeaveRow = {
  id: string;
  studentId: string;
  studentName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentUrl?: string | null;
  status: number;
  requestedByName: string;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectReason?: string | null;
  createdAt: string;
};

export function getStudentLeaves(
  accessToken: string,
  params: { studentId?: string; status?: number; page?: number; pageSize?: number } = {},
): Promise<PagedResult<StudentLeaveRow>> {
  return fetchJson(`/api/student-leave-requests${qs(params)}`, { headers: authHeader(accessToken) });
}
export function createStudentLeave(
  accessToken: string,
  body: { studentId: string; fromDate: string; toDate: string; reason: string; attachmentUrl?: string | null },
): Promise<{ id: string }> {
  return fetchJson('/api/student-leave-requests', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function approveStudentLeave(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/student-leave-requests/${id}/approve`, { method: 'POST', headers: authHeader(accessToken) });
}
export function rejectStudentLeave(accessToken: string, id: string, rejectReason?: string): Promise<void> {
  return fetchJson(`/api/student-leave-requests/${id}/reject`, {
    method: 'POST', headers: authJson(accessToken), body: JSON.stringify({ rejectReason: rejectReason ?? null }),
  });
}
export function cancelStudentLeave(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/student-leave-requests/${id}/cancel`, { method: 'POST', headers: authHeader(accessToken) });
}

// ===================== Đơn nghỉ phép giáo viên/nhân viên =====================
export type StaffLeaveRow = {
  id: string;
  staffUserId: string;
  staffName: string;
  leaveType: number;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: number;
  reviewedByName?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

export function getStaffLeaves(
  accessToken: string,
  params: { status?: number; mine?: boolean; page?: number; pageSize?: number } = {},
): Promise<PagedResult<StaffLeaveRow>> {
  return fetchJson(`/api/staff-leave-requests${qs(params)}`, { headers: authHeader(accessToken) });
}
export function createStaffLeave(
  accessToken: string,
  body: { leaveType: number; fromDate: string; toDate: string; totalDays: number; reason: string },
): Promise<{ id: string }> {
  return fetchJson('/api/staff-leave-requests', { method: 'POST', headers: authJson(accessToken), body: JSON.stringify(body) });
}
export function approveStaffLeave(accessToken: string, id: string, reviewNote?: string): Promise<void> {
  return fetchJson(`/api/staff-leave-requests/${id}/approve`, {
    method: 'POST', headers: authJson(accessToken), body: JSON.stringify({ reviewNote: reviewNote ?? null }),
  });
}
export function rejectStaffLeave(accessToken: string, id: string, reviewNote?: string): Promise<void> {
  return fetchJson(`/api/staff-leave-requests/${id}/reject`, {
    method: 'POST', headers: authJson(accessToken), body: JSON.stringify({ reviewNote: reviewNote ?? null }),
  });
}
export function cancelStaffLeave(accessToken: string, id: string): Promise<void> {
  return fetchJson(`/api/staff-leave-requests/${id}/cancel`, { method: 'POST', headers: authHeader(accessToken) });
}
