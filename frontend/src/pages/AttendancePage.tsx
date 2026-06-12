import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getAttendanceRecords,
  getClassById,
  getClassStudentCount,
  getClassesPaged,
  getSchoolYearsCurrent,
  getSchoolYearsRecent,
  getStudentsPaged,
  postAttendanceBulk,
  type BulkAttendanceItem,
  type ClassRow,
  type SchoolYearRow,
  type StudentListItem,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canStaffAccessAttendanceNav } from '../auth/staffNavAccess';
import { MaterialSymbol } from '../components/MaterialSymbol';

function localDateYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function displayStudentId(row: StudentListItem): string {
  if (row.registrationCode?.trim()) return row.registrationCode.trim();
  return row.id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function canWriteAttendance(roles: string[]) {
  return roles.some((r) => r === 'GiaoVien' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

const STATUS_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Có mặt' },
  { value: 1, label: 'Vắng' },
  { value: 2, label: 'Muộn' },
  { value: 3, label: 'Nghỉ có phép' },
];

export function AttendancePage() {
  const { accessToken, roles } = useAuth();
  const write = canWriteAttendance(roles);

  const [schoolYearId, setSchoolYearId] = useState<string | null>(null);
  const [schoolYearLabel, setSchoolYearLabel] = useState('');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(localDateYmd());

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [rowState, setRowState] = useState<Record<string, { status: number; reason: string }>>({});
  const [capacity, setCapacity] = useState<number | null>(null);
  const [enrolled, setEnrolled] = useState<number | null>(null);

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const loadCatalog = useCallback(async () => {
    if (!accessToken) {
      setLoadingCatalog(false);
      return;
    }
    setLoadingCatalog(true);
    setError(null);
    try {
      let sy = await getSchoolYearsCurrent(accessToken);
      if (sy.items.length === 0) sy = await getSchoolYearsRecent(accessToken);
      const y: SchoolYearRow | undefined = sy.items[0];
      if (!y) {
        setSchoolYearId(null);
        setSchoolYearLabel('');
        setClasses([]);
        setClassId('');
        return;
      }
      setSchoolYearId(y.id);
      setSchoolYearLabel(y.name);
      const cl = await getClassesPaged(accessToken, { schoolYearId: y.id, pageSize: 200 });
      setClasses(cl.items);
      setClassId((prev) => (prev && cl.items.some((c) => c.id === prev) ? prev : cl.items[0]?.id ?? ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được năm học / lớp.');
      setClasses([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedClassName = useMemo(
    () => classes.find((c) => c.id === classId)?.name ?? '',
    [classes, classId],
  );

  const presentCount = useMemo(
    () => students.reduce((n, s) => n + ((rowState[s.id]?.status ?? 0) === 0 ? 1 : 0), 0),
    [students, rowState],
  );
  const pct = capacity && capacity > 0 ? Math.min(100, Math.round((presentCount / capacity) * 100)) : 0;

  const loadRoster = useCallback(async () => {
    if (!accessToken || !schoolYearId || !classId) {
      setStudents([]);
      setRowState({});
      setCapacity(null);
      setEnrolled(null);
      return;
    }
    setLoadingRoster(true);
    setError(null);
    try {
      const [stu, rec, cls, n] = await Promise.all([
        getStudentsPaged(accessToken, {
          schoolYearId,
          classId,
          page: 1,
          pageSize: 200,
        }),
        getAttendanceRecords(accessToken, {
          classId,
          from: date,
          to: date,
          pageSize: 200,
        }),
        getClassById(accessToken, classId),
        getClassStudentCount(accessToken, classId, schoolYearId),
      ]);
      setStudents(stu.items);
      setCapacity(cls.capacity);
      setEnrolled(n);

      const byStudent: Record<string, { status: number; reason: string }> = {};
      const seen = new Set<string>();
      for (const r of rec.items) {
        if (seen.has(r.studentId)) continue;
        seen.add(r.studentId);
        byStudent[r.studentId] = { status: r.status, reason: r.reason ?? '' };
      }
      for (const s of stu.items) {
        if (!byStudent[s.id]) byStudent[s.id] = { status: 0, reason: '' };
      }
      setRowState(byStudent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
      setStudents([]);
      setRowState({});
    } finally {
      setLoadingRoster(false);
    }
  }, [accessToken, schoolYearId, classId, date]);

  useEffect(() => {
    if (!classId || !schoolYearId) return;
    void loadRoster();
  }, [classId, schoolYearId, date, loadRoster]);

  const setAllPresent = () => {
    setRowState((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = { status: 0, reason: next[s.id]?.reason ?? '' };
      }
      return next;
    });
  };

  const updateRow = (studentId: string, patch: Partial<{ status: number; reason: string }>) => {
    setRowState((prev) => ({
      ...prev,
      [studentId]: {
        status: patch.status ?? prev[studentId]?.status ?? 0,
        reason: patch.reason !== undefined ? patch.reason : (prev[studentId]?.reason ?? ''),
      },
    }));
  };

  const saveBulk = async () => {
    if (!accessToken || !classId || !write) return;
    setSaving(true);
    setError(null);
    try {
      const items: BulkAttendanceItem[] = students.map((s) => ({
        studentId: s.id,
        classId,
        date,
        status: rowState[s.id]?.status ?? 0,
        reason: (rowState[s.id]?.reason ?? '').trim() || null,
      }));
      await postAttendanceBulk(accessToken, items);
      setSuccessMessage(`Đã lưu điểm danh ${items.length} học sinh cho ngày ${date}.`);
      await loadRoster();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu điểm danh thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (!canStaffAccessAttendanceNav(roles)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-2 font-h1 text-primary">Điểm danh</h1>
        <p className="font-body-md text-on-surface-variant">
          Ghi nhận có mặt / vắng theo lớp và ngày
          {schoolYearLabel ? <span className="text-slate-400"> · {schoolYearLabel}</span> : null}
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMessage}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm md:col-span-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-label-sm uppercase tracking-wider text-slate-500">
              Chọn ngày điểm danh
            </label>
            <div className="relative">
              <MaterialSymbol
                name="event"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 font-body-md font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="min-w-[200px] flex-[2]">
            <label className="mb-2 block text-label-sm uppercase tracking-wider text-slate-500">Chọn lớp học</label>
            <div className="relative">
              <MaterialSymbol
                name="group"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={loadingCatalog || classes.length === 0}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 font-body-md font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              >
                <option value="">{loadingCatalog ? 'Đang tải...' : '— Chọn lớp —'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadRoster()}
            disabled={loadingRoster || !classId}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-bold text-white transition-all hover:bg-tertiary active:scale-95 disabled:opacity-50"
          >
            <MaterialSymbol name="refresh" />
            Tải lại danh sách
          </button>
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-secondary-container p-6 shadow-sm">
          <p className="text-sm font-medium text-white/80">Sĩ số / Có mặt (theo bảng)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{presentCount}</span>
            <span className="font-bold text-white/60">
              / {enrolled ?? '—'} học sinh
            </span>
          </div>
          {capacity != null ? (
            <p className="mt-1 text-xs text-white/70">Sức chứa lớp: {capacity}</p>
          ) : null}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-h3 text-primary">Danh sách điểm danh</h3>
            <p className="text-body-md text-slate-500">
              {selectedClassName ? `Lớp: ${selectedClassName}` : 'Chọn lớp để xem học sinh.'} · Ngày {date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {write ? (
              <>
                <button
                  type="button"
                  onClick={setAllPresent}
                  disabled={students.length === 0}
                  className="rounded-lg border border-primary px-4 py-2 font-bold text-label-md text-primary transition-colors hover:bg-primary/5 disabled:opacity-40"
                >
                  Chọn tất cả có mặt
                </button>
                <button
                  type="button"
                  onClick={() => void saveBulk()}
                  disabled={saving || students.length === 0 || !classId}
                  className="rounded-lg bg-primary px-6 py-2 font-bold text-white shadow-md transition-all hover:bg-tertiary disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                </button>
              </>
            ) : (
              <span className="text-sm text-slate-500">Chỉ xem — không có quyền ghi điểm danh.</span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingRoster ? (
            <p className="px-6 py-12 text-center text-slate-500">Đang tải danh sách...</p>
          ) : !classId ? (
            <p className="px-6 py-12 text-center text-slate-500">Chọn năm học có lớp và chọn lớp để điểm danh.</p>
          ) : students.length === 0 ? (
            <p className="px-6 py-12 text-center text-slate-500">Lớp chưa có học sinh được gán.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="w-14 px-4 py-4 font-label-sm uppercase tracking-wider text-slate-500">STT</th>
                  <th className="px-4 py-4 font-label-sm uppercase tracking-wider text-slate-500">Họ và tên</th>
                  <th className="min-w-[180px] px-4 py-4 font-label-sm uppercase tracking-wider text-slate-500">
                    Trạng thái
                  </th>
                  <th className="min-w-[200px] px-4 py-4 font-label-sm uppercase tracking-wider text-slate-500">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s, idx) => {
                  const initials = s.fullName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(-2)
                    .map((w) => w[0]!.toUpperCase())
                    .join('');
                  const st = rowState[s.id]?.status ?? 0;
                  const reason = rowState[s.id]?.reason ?? '';
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-4 py-4 font-body-md font-bold text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-primary">
                            {initials || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-on-background">{s.fullName}</p>
                            <p className="text-xs text-slate-500">ID: {displayStudentId(s)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={st}
                          onChange={(e) => updateRow(s.id, { status: Number(e.target.value) })}
                          disabled={!write}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => updateRow(s.id, { reason: e.target.value })}
                          disabled={!write}
                          placeholder={st === 1 || st === 3 ? 'Lý do vắng / phép...' : 'Tuỳ chọn'}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
