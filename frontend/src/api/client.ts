const apiBase = () => (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

const debugApi =
  import.meta.env.DEV || (import.meta.env.VITE_DEBUG_API as string | undefined) === 'true';

function logApi(method: string, path: string, status: number, bodyPreview: string) {
  if (!debugApi) return;
  const url = `${apiBase()}${path}`;
  const fn = status >= 400 ? console.warn : console.log;
  fn(`[QT API] ${method} ${url} → ${status}`, bodyPreview.length > 4000 ? `${bodyPreview.slice(0, 4000)}…` : bodyPreview);
}

function parseErrorFromText(text: string, statusText: string, status: number): string {
  if (!text) return statusText || `Lỗi ${status}`;
  try {
    const j = JSON.parse(text) as unknown;
    if (typeof j === 'string') return j;
    if (j && typeof j === 'object') {
      if ('detail' in j && typeof (j as { detail: unknown }).detail === 'string') {
        const d = (j as { detail: string }).detail;
        if ('title' in j && typeof (j as { title: unknown }).title === 'string')
          return `${(j as { title: string }).title}: ${d}`;
        return d;
      }
      if ('title' in j && typeof (j as { title: unknown }).title === 'string') {
        const title = (j as { title: string }).title;
        if (status === 401 && title.trim().toLowerCase() === 'unauthorized')
          return 'Email hoặc mật khẩu không đúng.';
        return title;
      }
      if ('message' in j && typeof (j as { message: unknown }).message === 'string')
        return (j as { message: string }).message;
      if (Array.isArray(j)) return j.map(String).join('; ');
    }
  } catch {
    /* not JSON */
  }
  return text.slice(0, 500);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBase()}${path}`;
  const method = init?.method ?? 'GET';
  const res = await fetch(url, init);
  const text = await res.text();
  logApi(method, path, res.status, text || '(empty body)');

  if (!res.ok) {
    const message = parseErrorFromText(text, res.statusText, res.status);
    if (debugApi) {
      const where = url !== path ? `${path} → ${url}` : path;
      console.warn(`[QT API] HTTP ${res.status} ${method} ${where} — ${message}`);
    }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  email: string;
  roles: string[];
};

export async function postLogin(body: { email: string; password: string }): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type ForgotPasswordResponse = {
  message: string;
  resetToken?: string | null;
};

export async function postForgotPassword(body: { email: string }): Promise<ForgotPasswordResponse> {
  return fetchJson<ForgotPasswordResponse>('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function postResetPassword(body: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<void> {
  return fetchJson<void>('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function postRegisterParent(body: {
  email: string;
  password: string;
  fullName: string;
  studentIdToLink?: string | null;
  studentRegistrationCodeToLink?: string | null;
}): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/auth/register-parent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type StaffSummary = {
  studentCount: number;
  classCount: number;
  publishedAnnouncementsCount: number;
  paymentsTotalThisMonthUtc: number | null;
  /** Số học sinh mới theo tháng (UTC), 6 phần tử từ cũ → mới nhất. */
  newStudentsLast6MonthsUtc: number[];
  studentAgeSlices: { label: string; count: number }[];
};

export async function getStaffDashboardSummary(accessToken: string): Promise<StaffSummary> {
  return fetchJson<StaffSummary>('/api/dashboard/staff-summary', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** CSV UTF-8 (BOM) — chỉ BanGiamHieu / SuperAdmin. */
export async function getDashboardExportReport(accessToken: string): Promise<Blob> {
  const url = `${apiBase()}/api/dashboard/export-report`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseErrorFromText(text, res.statusText, res.status));
  }
  return res.blob();
}

export type ChildRow = { id: string; fullName: string; dateOfBirth: string; status: number };

export async function getMyChildren(accessToken: string): Promise<ChildRow[]> {
  return fetchJson<ChildRow[]>('/api/students/me/children', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function authJson(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

export type PagedResult<T> = { items: T[]; totalCount: number; page: number; pageSize: number };

/** API mới trả thêm lớp/mã; API cũ chỉ có 4 trường đầu — các field còn lại optional. */
export type StudentListItem = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  status: number;
  registrationCode?: string | null;
  currentClassId?: string | null;
  currentClassName?: string | null;
  currentGradeId?: string | null;
};

export type StudentStats = { total: number; dangHoc: number; tamNghi: number; nghiHoc: number };

export async function getStudentStats(
  accessToken: string,
  params: { q?: string; status?: number; classId?: string; schoolYearId?: string },
): Promise<StudentStats> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.status !== undefined) sp.set('status', String(params.status));
  if (params.classId) sp.set('classId', params.classId);
  if (params.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  const q = sp.toString();
  return fetchJson<StudentStats>(`/api/students/stats${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Không ném lỗi khi 404 — backend cũ chưa có route GET /api/students/stats. */
export async function fetchStudentStatsResult(
  accessToken: string,
  params: { q?: string; status?: number; classId?: string; schoolYearId?: string },
): Promise<{ stats: StudentStats | null; notFound: boolean }> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.status !== undefined) sp.set('status', String(params.status));
  if (params.classId) sp.set('classId', params.classId);
  if (params.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  const q = sp.toString();
  const path = `/api/students/stats${q ? `?${q}` : ''}`;
  const url = `${apiBase()}${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await res.text();
  logApi('GET', path, res.status, text || '(empty body)');
  if (res.status === 404) return { stats: null, notFound: true };
  if (!res.ok) throw new Error(parseErrorFromText(text, res.statusText, res.status));
  if (!text) return { stats: null, notFound: false };
  return { stats: JSON.parse(text) as StudentStats, notFound: false };
}

export async function getStudentsPaged(
  accessToken: string,
  params: {
    q?: string;
    status?: number;
    classId?: string;
    schoolYearId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PagedResult<StudentListItem>> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.status !== undefined) sp.set('status', String(params.status));
  if (params.classId) sp.set('classId', params.classId);
  if (params.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  const q = sp.toString();
  return fetchJson<PagedResult<StudentListItem>>(`/api/students${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type StudentDetail = {
  id: string;
  fullName: string;
  gender: number;
  dateOfBirth: string;
  status: number;
  registrationCode: string | null;
  address: string | null;
  healthNote: string | null;
  allergyNote: string | null;
};

export async function getStudentById(accessToken: string, id: string): Promise<StudentDetail> {
  return fetchJson<StudentDetail>(`/api/students/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type UpsertStudentBody = {
  fullName: string;
  gender: number;
  dateOfBirth: string;
  address?: string | null;
  healthNote?: string | null;
  allergyNote?: string | null;
  status: number;
};

export async function createStudent(accessToken: string, body: UpsertStudentBody): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/students', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function updateStudent(accessToken: string, id: string, body: UpsertStudentBody): Promise<void> {
  return fetchJson<void>(`/api/students/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteStudent(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/students/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function assignStudentClass(
  accessToken: string,
  studentId: string,
  body: { classId: string; schoolYearId: string; fromDate: string },
): Promise<void> {
  return fetchJson<void>(`/api/students/${studentId}/class-assignments`, {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export type SchoolYearRow = { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean };

export async function getSchoolYearsCurrent(accessToken: string): Promise<PagedResult<SchoolYearRow>> {
  return fetchJson<PagedResult<SchoolYearRow>>('/api/school-years?isCurrent=true&pageSize=10', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getSchoolYearsRecent(accessToken: string): Promise<PagedResult<SchoolYearRow>> {
  return fetchJson<PagedResult<SchoolYearRow>>('/api/school-years?pageSize=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getSchoolYearsPaged(
  accessToken: string,
  params?: { q?: string; isCurrent?: boolean; page?: number; pageSize?: number },
): Promise<PagedResult<SchoolYearRow>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.isCurrent === true) sp.set('isCurrent', 'true');
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 100));
  return fetchJson<PagedResult<SchoolYearRow>>(`/api/school-years?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type UpsertSchoolYearBody = { name: string; startDate: string; endDate: string; isCurrent: boolean };

export async function createSchoolYear(accessToken: string, body: UpsertSchoolYearBody): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/school-years', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function updateSchoolYear(accessToken: string, id: string, body: UpsertSchoolYearBody): Promise<void> {
  return fetchJson<void>(`/api/school-years/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteSchoolYear(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/school-years/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getSchoolYearById(
  accessToken: string,
  id: string,
): Promise<{ id: string; name: string; startDate: string; endDate: string; isCurrent: boolean }> {
  return fetchJson(`/api/school-years/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type GradeRow = { id: string; name: string; sortOrder: number };

export async function getGrades(accessToken: string): Promise<PagedResult<GradeRow>> {
  return fetchJson<PagedResult<GradeRow>>('/api/grades?pageSize=100', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getGradesPaged(
  accessToken: string,
  params?: { q?: string; page?: number; pageSize?: number },
): Promise<PagedResult<GradeRow>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 100));
  return fetchJson<PagedResult<GradeRow>>(`/api/grades?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type UpsertGradeBody = { name: string; sortOrder: number };

export async function createGrade(accessToken: string, body: UpsertGradeBody): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/grades', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function updateGrade(accessToken: string, id: string, body: UpsertGradeBody): Promise<void> {
  return fetchJson<void>(`/api/grades/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteGrade(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/grades/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getGradeById(
  accessToken: string,
  id: string,
): Promise<{ id: string; name: string; sortOrder: number }> {
  return fetchJson(`/api/grades/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type ClassRow = {
  id: string;
  name: string;
  schoolYearId: string;
  gradeId: string;
  capacity: number;
  homeroomTeacherId: string | null;
};

export async function getClassesForYear(
  accessToken: string,
  schoolYearId: string,
  gradeId?: string,
): Promise<PagedResult<ClassRow>> {
  const sp = new URLSearchParams({ schoolYearId, pageSize: '200' });
  if (gradeId) sp.set('gradeId', gradeId);
  return fetchJson<PagedResult<ClassRow>>(`/api/classes?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getClassesPaged(
  accessToken: string,
  params: {
    schoolYearId?: string;
    gradeId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PagedResult<ClassRow>> {
  const sp = new URLSearchParams();
  if (params.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params.gradeId) sp.set('gradeId', params.gradeId);
  if (params.q) sp.set('q', params.q);
  if (params.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params.pageSize ?? 200));
  return fetchJson<PagedResult<ClassRow>>(`/api/classes?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type UpsertClassBody = {
  schoolYearId: string;
  gradeId: string;
  name: string;
  capacity: number;
  homeroomTeacherId?: string | null;
};

export async function createClass(accessToken: string, body: UpsertClassBody): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/classes', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function updateClass(accessToken: string, id: string, body: UpsertClassBody): Promise<void> {
  return fetchJson<void>(`/api/classes/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteClass(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/classes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type UserOptionRow = { id: string; email: string };

export type UserDirectoryRow = { id: string; email: string; fullName: string; roles: string[]; isLocked?: boolean };

export type UserDetailDto = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  isLocked: boolean;
};

export async function getUsersDirectory(
  accessToken: string,
  params?: { q?: string; page?: number; pageSize?: number },
): Promise<PagedResult<UserDirectoryRow>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.pageSize != null) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return fetchJson(`/api/users${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function postRegisterStaff(
  accessToken: string,
  body: {
    email: string;
    password: string;
    fullName: string;
    role: 'BanGiamHieu' | 'GiaoVien' | 'KeToan' | 'PhuHuynh';
  },
): Promise<{ id: string; email: string; role: string }> {
  return fetchJson('/api/auth/register-staff', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function getUserById(accessToken: string, id: string): Promise<UserDetailDto> {
  return fetchJson<UserDetailDto>(`/api/users/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function putUser(
  accessToken: string,
  id: string,
  body: { fullName: string; email: string; roles: string[]; lockoutEnabled: boolean; newPassword?: string | null },
): Promise<void> {
  return fetchJson<void>(`/api/users/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteUser(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getHomeroomOptions(accessToken: string): Promise<UserOptionRow[]> {
  return fetchJson<UserOptionRow[]>('/api/users/homeroom-options', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getClassById(
  accessToken: string,
  id: string,
): Promise<{
  id: string;
  name: string;
  schoolYearId: string;
  gradeId: string;
  capacity: number;
  homeroomTeacherId: string | null;
}> {
  return fetchJson(`/api/classes/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getClassStudentCount(
  accessToken: string,
  classId: string,
  schoolYearId: string,
): Promise<number> {
  const sp = new URLSearchParams({ classId, schoolYearId, pageSize: '1' });
  const r = await fetchJson<PagedResult<StudentListItem>>(`/api/students?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return r.totalCount;
}

export type AttendanceRecordRow = {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: number;
  reason: string | null;
};

export async function getAttendanceRecords(
  accessToken: string,
  params: { classId?: string; from: string; to: string; page?: number; pageSize?: number; studentId?: string },
): Promise<PagedResult<AttendanceRecordRow>> {
  const sp = new URLSearchParams({
    from: params.from,
    to: params.to,
    pageSize: String(params.pageSize ?? 200),
  });
  if (params.classId) sp.set('classId', params.classId);
  if (params.page) sp.set('page', String(params.page));
  if (params.studentId) sp.set('studentId', params.studentId);
  return fetchJson<PagedResult<AttendanceRecordRow>>(`/api/attendance/records?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type BulkAttendanceItem = {
  studentId: string;
  classId: string;
  date: string;
  status: number;
  reason?: string | null;
};

export async function postAttendanceBulk(
  accessToken: string,
  items: BulkAttendanceItem[],
): Promise<{ count: number }> {
  return fetchJson<{ count: number }>('/api/attendance/records/bulk', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(items),
  });
}

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  scope: number;
  classId: string | null;
  status: number;
  publishedAt: string | null;
  createdByUserId: string;
  createdAt: string;
};

export async function getAnnouncementsPaged(
  accessToken: string,
  params?: { q?: string; status?: number; classId?: string; page?: number; pageSize?: number },
): Promise<PagedResult<AnnouncementRow>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.status !== undefined) sp.set('status', String(params.status));
  if (params?.classId) sp.set('classId', params.classId);
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 15));
  return fetchJson<PagedResult<AnnouncementRow>>(`/api/announcements?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type CreateAnnouncementDraftBody = {
  title: string;
  body: string;
  scope: number;
  classId?: string | null;
};

export async function postAnnouncementDraft(
  accessToken: string,
  body: CreateAnnouncementDraftBody,
): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/announcements/draft', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function publishAnnouncement(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/announcements/${id}/publish`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateAnnouncement(
  accessToken: string,
  id: string,
  body: CreateAnnouncementDraftBody,
): Promise<void> {
  return fetchJson<void>(`/api/announcements/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify({
      title: body.title,
      body: body.body,
      scope: body.scope,
      classId: body.classId ?? null,
    }),
  });
}

export async function deleteAnnouncement(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/announcements/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Khớp `QuangTrung.Domain.Enums.FeeType` */
export type FeeStructureRow = {
  id: string;
  schoolYearId: string;
  name: string;
  amount: number;
  feeType: number;
};

export type UpsertFeeStructureBody = {
  schoolYearId: string;
  name: string;
  amount: number;
  feeType: number;
};

export async function getFeeStructuresPaged(
  accessToken: string,
  params?: { schoolYearId?: string; q?: string; page?: number; pageSize?: number },
): Promise<PagedResult<FeeStructureRow>> {
  const sp = new URLSearchParams();
  if (params?.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params?.q) sp.set('q', params.q);
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 20));
  return fetchJson<PagedResult<FeeStructureRow>>(`/api/fee-structures?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getFeeStructureById(accessToken: string, id: string): Promise<FeeStructureRow> {
  return fetchJson<FeeStructureRow>(`/api/fee-structures/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createFeeStructure(
  accessToken: string,
  body: UpsertFeeStructureBody,
): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/fee-structures', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function updateFeeStructure(
  accessToken: string,
  id: string,
  body: UpsertFeeStructureBody,
): Promise<void> {
  return fetchJson<void>(`/api/fee-structures/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteFeeStructure(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/fee-structures/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** GET /api/students/billing-view — dùng cho Kế toán / BGH (không cần StudentsReadInternal). */
export type StudentBillingRow = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  status: number;
  registrationCode: string | null;
  currentClassName: string | null;
};

export async function getStudentsBillingView(
  accessToken: string,
  params?: { q?: string; page?: number; pageSize?: number },
): Promise<PagedResult<StudentBillingRow>> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 100));
  return fetchJson<PagedResult<StudentBillingRow>>(`/api/students/billing-view?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type StudentFeeAssignmentRow = {
  id: string;
  studentId: string;
  studentFullName: string;
  schoolYearId: string;
  schoolYearName: string;
  feeStructureId: string;
  feeStructureName: string;
  month: number;
  amountOverride: number | null;
  resolvedAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

export type UpsertStudentFeeAssignmentBody = {
  studentId: string;
  schoolYearId: string;
  feeStructureId: string;
  month: number;
  amountOverride: number | null;
};

export async function getStudentFeeAssignmentsPaged(
  accessToken: string,
  params?: {
    studentId?: string;
    schoolYearId?: string;
    month?: number;
    page?: number;
    pageSize?: number;
  },
): Promise<PagedResult<StudentFeeAssignmentRow>> {
  const sp = new URLSearchParams();
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params?.month !== undefined) sp.set('month', String(params.month));
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 20));
  return fetchJson<PagedResult<StudentFeeAssignmentRow>>(`/api/student-fee-assignments?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createStudentFeeAssignment(
  accessToken: string,
  body: UpsertStudentFeeAssignmentBody,
): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/student-fee-assignments', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function updateStudentFeeAssignment(
  accessToken: string,
  id: string,
  body: UpsertStudentFeeAssignmentBody,
): Promise<void> {
  return fetchJson<void>(`/api/student-fee-assignments/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteStudentFeeAssignment(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/student-fee-assignments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type PaymentRow = {
  id: string;
  studentId: string;
  studentFullName: string;
  studentRegistrationCode: string | null;
  currentClassName: string | null;
  feeLineDescription: string | null;
  studentFeeAssignmentId: string | null;
  amount: number;
  paidAt: string;
  method: number;
  receiptNumber: string | null;
  note: string | null;
};

export type PaymentInvoiceDetail = {
  id: string;
  studentId: string;
  studentFullName: string;
  studentRegistrationCode: string | null;
  currentClassName: string | null;
  feeLineDescription: string | null;
  studentFeeAssignmentId: string | null;
  amount: number;
  paidAt: string;
  method: number;
  receiptNumber: string | null;
  note: string | null;
  schoolTitle: string;
};

export type PaymentsSummary = { totalAmount: number };

export async function getPaymentsPaged(
  accessToken: string,
  params?: {
    studentId?: string;
    classId?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PagedResult<PaymentRow>> {
  const sp = new URLSearchParams();
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.classId) sp.set('classId', params.classId);
  if (params?.q) sp.set('q', params.q);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.page) sp.set('page', String(params.page));
  sp.set('pageSize', String(params?.pageSize ?? 20));
  return fetchJson<PagedResult<PaymentRow>>(`/api/payments?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getPaymentsSummary(
  accessToken: string,
  params?: { studentId?: string; classId?: string; q?: string; from?: string; to?: string },
): Promise<PaymentsSummary> {
  const sp = new URLSearchParams();
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.classId) sp.set('classId', params.classId);
  if (params?.q) sp.set('q', params.q);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  const q = sp.toString();
  return fetchJson<PaymentsSummary>(`/api/payments/summary${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getPaymentInvoiceDetail(accessToken: string, id: string): Promise<PaymentInvoiceDetail> {
  return fetchJson<PaymentInvoiceDetail>(`/api/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updatePayment(
  accessToken: string,
  id: string,
  body: { receiptNumber?: string | null; note?: string | null },
): Promise<void> {
  return fetchJson<void>(`/api/payments/${id}`, {
    method: 'PUT',
    headers: authJson(accessToken),
    body: JSON.stringify({
      receiptNumber: body.receiptNumber ?? null,
      note: body.note ?? null,
    }),
  });
}

export async function deletePayment(accessToken: string, id: string): Promise<void> {
  return fetchJson<void>(`/api/payments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type CreatePaymentBody = {
  studentId: string;
  amount: number;
  method: number;
  receiptNumber?: string | null;
  note?: string | null;
};

export async function createPayment(accessToken: string, body: CreatePaymentBody): Promise<{ id: string }> {
  return fetchJson<{ id: string }>('/api/payments', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify({
      studentId: body.studentId,
      amount: body.amount,
      method: body.method,
      receiptNumber: body.receiptNumber ?? null,
      note: body.note ?? null,
    }),
  });
}

/** Ghi nhận nhiều giao dịch: mỗi dòng gán phí một bản ghi, số tiền = phần còn lại của dòng đó. */
export async function createPaymentsForFeeAssignments(
  accessToken: string,
  body: {
    studentId: string;
    method: number;
    receiptNumber?: string | null;
    note?: string | null;
    studentFeeAssignmentIds: string[];
  },
): Promise<{ count: number }> {
  return fetchJson<{ count: number }>('/api/payments/for-assignments', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify({
      studentId: body.studentId,
      method: body.method,
      receiptNumber: body.receiptNumber ?? null,
      note: body.note ?? null,
      studentFeeAssignmentIds: body.studentFeeAssignmentIds,
    }),
  });
}

export type ZaloPayCreateOrderResponse = {
  orderUrl: string | null;
  qrCode: string | null;
  appTransId: string;
  localOrderId: string;
};

export async function postZaloPayCreateOrder(
  accessToken: string,
  body: {
    studentId: string;
    amountVnd: number;
    description?: string | null;
    studentFeeAssignmentId?: string | null;
  },
): Promise<ZaloPayCreateOrderResponse> {
  return fetchJson<ZaloPayCreateOrderResponse>('/api/payments/zalopay/create', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify({
      studentId: body.studentId,
      amountVnd: body.amountVnd,
      description: body.description ?? null,
      studentFeeAssignmentId: body.studentFeeAssignmentId ?? null,
    }),
  });
}

export type ZaloPaySyncFromQueryResponse = { status: string; message?: string | null };

/** Đối soát đơn đã thanh toán qua ZaloPay /v2/query (khi callback không tới localhost). */
export async function postZaloPaySyncFromQuery(
  accessToken: string,
  body: { appTransId: string },
): Promise<ZaloPaySyncFromQueryResponse> {
  return fetchJson<ZaloPaySyncFromQueryResponse>('/api/payments/zalopay/sync-from-query', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify({ appTransId: body.appTransId }),
  });
}

/** Năm học liên quan các con (gán phí hoặc lớp hiện tại) — phụ huynh, không cần Catalog.Read. */
export type ParentSchoolYearBrief = { id: string; name: string; isCurrent: boolean };

export async function getParentSchoolYears(accessToken: string): Promise<ParentSchoolYearBrief[]> {
  return fetchJson<ParentSchoolYearBrief[]>('/api/parent/school-years', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function postParentLinkStudent(
  accessToken: string,
  body: { code: string },
): Promise<{ linked?: boolean; alreadyLinked?: boolean; studentId?: string }> {
  return fetchJson('/api/parent/link-student', {
    method: 'POST',
    headers: authJson(accessToken),
    body: JSON.stringify({ code: body.code.trim() }),
  });
}
