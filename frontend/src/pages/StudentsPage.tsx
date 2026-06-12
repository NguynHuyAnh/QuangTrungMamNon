import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router-dom';
import {
  assignStudentClass,
  createStudent,
  deleteStudent,
  getClassById,
  getClassStudentCount,
  getClassesForYear,
  getGrades,
  getSchoolYearsCurrent,
  getSchoolYearsRecent,
  fetchStudentStatsResult,
  getStudentById,
  getStudentsPaged,
  updateStudent,
  type ClassRow,
  type GradeRow,
  type StudentDetail,
  type StudentListItem,
  type UpsertStudentBody,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canStaffAccessStudentsNav } from '../auth/staffNavAccess';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 10;

function canWriteStudents(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function displayStudentId(row: StudentListItem): string {
  if (row.registrationCode?.trim()) return row.registrationCode.trim();
  return row.id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function formatDob(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function localDateYmd(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function gradeIcon(name: string): string {
  if (name.includes('Mầm')) return 'child_care';
  if (name.includes('Chồi')) return 'toys';
  if (name.includes('Lá')) return 'school';
  return 'class';
}

type UpsertFormState = {
  fullName: string;
  gender: number;
  dateOfBirth: string;
  address: string;
  healthNote: string;
  allergyNote: string;
  status: number;
};

const emptyUpsert: UpsertFormState = {
  fullName: '',
  gender: 1,
  dateOfBirth: '',
  address: '',
  healthNote: '',
  allergyNote: '',
  status: 0,
};

function detailToForm(d: StudentDetail): UpsertFormState {
  return {
    fullName: d.fullName,
    gender: d.gender,
    dateOfBirth: d.dateOfBirth,
    address: d.address ?? '',
    healthNote: d.healthNote ?? '',
    allergyNote: d.allergyNote ?? '',
    status: d.status,
  };
}

function toUpsertBody(f: UpsertFormState): UpsertStudentBody {
  return {
    fullName: f.fullName.trim(),
    gender: f.gender,
    dateOfBirth: f.dateOfBirth,
    address: f.address.trim() || null,
    healthNote: f.healthNote.trim() || null,
    allergyNote: f.allergyNote.trim() || null,
    status: f.status,
  };
}

export function StudentsPage() {
  const { accessToken, roles } = useAuth();
  const write = canWriteStudents(roles);

  const [schoolYearId, setSchoolYearId] = useState<string | null>(null);
  const [schoolYearLabel, setSchoolYearLabel] = useState('');
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [classesAll, setClassesAll] = useState<ClassRow[]>([]);

  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<{ total: number; dangHoc: number; tamNghi: number; nghiHoc: number } | null>(
    null,
  );
  const [statsEndpoint404, setStatsEndpoint404] = useState(false);
  const [list, setList] = useState<StudentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [menuRowId, setMenuRowId] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStudent, setAssignStudent] = useState<StudentListItem | null>(null);
  const [assignGradeId, setAssignGradeId] = useState<string | null>(null);
  const [assignClasses, setAssignClasses] = useState<ClassRow[]>([]);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignCapacity, setAssignCapacity] = useState<number | null>(null);
  const [assignEnrolled, setAssignEnrolled] = useState<number | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState<'add' | 'edit'>('add');
  const [upsertStudentId, setUpsertStudentId] = useState<string | null>(null);
  const [upsertForm, setUpsertForm] = useState<UpsertFormState>(emptyUpsert);
  const [upsertLoading, setUpsertLoading] = useState(false);
  const [upsertSubmitting, setUpsertSubmitting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 6000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, filterClassId, filterStatus, schoolYearId]);

  const listParams = useMemo(
    () => ({
      q: qDebounced || undefined,
      status: filterStatus === '' ? undefined : Number(filterStatus),
      classId: filterClassId || undefined,
      schoolYearId: schoolYearId ?? undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [qDebounced, filterClassId, filterStatus, schoolYearId, page],
  );

  const statsParams = useMemo(
    () => ({
      q: qDebounced || undefined,
      status: filterStatus === '' ? undefined : Number(filterStatus),
      classId: filterClassId || undefined,
      schoolYearId: schoolYearId ?? undefined,
    }),
    [qDebounced, filterClassId, filterStatus, schoolYearId],
  );

  const loadCatalog = useCallback(async () => {
    if (!accessToken) return;
    try {
      let sy = await getSchoolYearsCurrent(accessToken);
      if (sy.items.length === 0) {
        sy = await getSchoolYearsRecent(accessToken);
      }
      const first = sy.items[0];
      if (first) {
        setSchoolYearId(first.id);
        setSchoolYearLabel(first.name);
      } else {
        setSchoolYearId(null);
        setSchoolYearLabel('');
      }
      const g = await getGrades(accessToken);
      setGrades([...g.items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Không tải được danh mục năm học / khối.');
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!accessToken || !schoolYearId) {
      setClassesAll([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const c = await getClassesForYear(accessToken, schoolYearId);
        if (!cancelled) setClassesAll(c.items);
      } catch {
        if (!cancelled) setClassesAll([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, schoolYearId]);

  const refreshData = useCallback(async () => {
    if (!accessToken || !schoolYearId) {
      setLoading(false);
      setList([]);
      setTotalCount(0);
      setStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    setStatsEndpoint404(false);
    try {
      const p = await getStudentsPaged(accessToken, listParams);
      setList(p.items);
      setTotalCount(p.totalCount);
      try {
        const r = await fetchStudentStatsResult(accessToken, statsParams);
        setStats(r.stats);
        setStatsEndpoint404(r.notFound);
      } catch {
        setStats(null);
        setStatsEndpoint404(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách học sinh.');
      setList([]);
      setTotalCount(0);
      setStats(null);
      setStatsEndpoint404(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, schoolYearId, statsParams, listParams]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  const openAssign = (row: StudentListItem) => {
    setMenuRowId(null);
    setAssignStudent(row);
    setAssignGradeId(row.currentGradeId ?? grades[0]?.id ?? null);
    setAssignClassId(row.currentClassId ?? '');
    setAssignCapacity(null);
    setAssignEnrolled(null);
    setAssignOpen(true);
  };

  useEffect(() => {
    if (!assignOpen || !accessToken || !schoolYearId || !assignGradeId) {
      setAssignClasses([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const c = await getClassesForYear(accessToken, schoolYearId, assignGradeId);
        if (!cancelled) {
          setAssignClasses(c.items);
          setAssignClassId((prev) => (prev && c.items.some((x) => x.id === prev) ? prev : c.items[0]?.id ?? ''));
        }
      } catch {
        if (!cancelled) setAssignClasses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignOpen, accessToken, schoolYearId, assignGradeId]);

  useEffect(() => {
    if (!assignOpen || !accessToken || !assignClassId || !schoolYearId) {
      setAssignCapacity(null);
      setAssignEnrolled(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [cls, n] = await Promise.all([
          getClassById(accessToken, assignClassId),
          getClassStudentCount(accessToken, assignClassId, schoolYearId),
        ]);
        if (!cancelled) {
          setAssignCapacity(cls.capacity);
          setAssignEnrolled(n);
        }
      } catch {
        if (!cancelled) {
          setAssignCapacity(null);
          setAssignEnrolled(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignOpen, accessToken, assignClassId, schoolYearId]);

  const closeAssign = () => {
    setAssignOpen(false);
    setAssignStudent(null);
    setAssignSubmitting(false);
  };

  const submitAssign = async () => {
    if (!accessToken || !assignStudent || !schoolYearId || !assignClassId) return;
    setAssignSubmitting(true);
    try {
      await assignStudentClass(accessToken, assignStudent.id, {
        classId: assignClassId,
        schoolYearId,
        fromDate: localDateYmd(),
      });
      setSuccessMessage('Đã gán lớp thành công.');
      setError(null);
      closeAssign();
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gán lớp thất bại.');
      setSuccessMessage(null);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const openAdd = () => {
    setMenuRowId(null);
    setError(null);
    setUpsertMode('add');
    setUpsertStudentId(null);
    setUpsertForm({ ...emptyUpsert, dateOfBirth: localDateYmd() });
    setUpsertOpen(true);
  };

  const openEdit = async (id: string) => {
    if (!accessToken) return;
    setMenuRowId(null);
    setUpsertMode('edit');
    setUpsertStudentId(id);
    setUpsertOpen(true);
    setUpsertLoading(true);
    try {
      const d = await getStudentById(accessToken, id);
      setUpsertForm(detailToForm(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được học sinh.');
      setUpsertOpen(false);
    } finally {
      setUpsertLoading(false);
    }
  };

  const closeUpsert = () => {
    setUpsertOpen(false);
    setUpsertStudentId(null);
    setUpsertSubmitting(false);
  };

  const submitUpsert = async () => {
    if (!accessToken || !upsertForm.fullName.trim() || !upsertForm.dateOfBirth) return;
    setUpsertSubmitting(true);
    setError(null);
    try {
      const body = toUpsertBody(upsertForm);
      if (upsertMode === 'add') {
        await createStudent(accessToken, body);
        setSuccessMessage('Đã thêm học sinh thành công. Bạn có thể gán lớp trong cột Thao tác.');
        setPage(1);
      } else if (upsertStudentId) {
        await updateStudent(accessToken, upsertStudentId, body);
        setSuccessMessage('Đã cập nhật hồ sơ học sinh.');
      }
      closeUpsert();
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
      setSuccessMessage(null);
    } finally {
      setUpsertSubmitting(false);
    }
  };

  const confirmDelete = async (id: string) => {
    if (!accessToken || !window.confirm('Xóa học sinh này? Thao tác có thể ảnh hưởng dữ liệu liên quan.')) return;
    setMenuRowId(null);
    try {
      await deleteStudent(accessToken, id);
      setSuccessMessage('Đã xóa học sinh khỏi danh sách.');
      setError(null);
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
      setSuccessMessage(null);
    }
  };

  const selectedAssignClassName = assignClasses.find((c) => c.id === assignClassId)?.name ?? '';

  if (!canStaffAccessStudentsNav(roles)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <>
      <div className="mb-8 flex min-w-0 flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="min-w-0">
          <h1 className="mb-2 font-h1 text-primary">Quản lý Học sinh</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body-md text-on-surface-variant">
            <MaterialSymbol name="group" className="text-sm" />
            Danh sách tất cả học sinh đang theo học tại trường
            {schoolYearLabel ? (
              <span className="text-slate-400">· {schoolYearLabel}</span>
            ) : null}
          </p>
        </div>
        {write ? (
          <button
            type="button"
            onClick={openAdd}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-tertiary active:scale-95 sm:w-auto"
          >
            <MaterialSymbol name="person_add" />
            Thêm học sinh mới
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <span className="pt-0.5">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Đóng thông báo"
          >
            <MaterialSymbol name="close" className="text-lg" />
          </button>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-gutter md:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <MaterialSymbol name="groups" filled />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng số học sinh</p>
            <h3 className="font-h2 text-h2 leading-none text-secondary-container">
              {stats ? stats.total.toLocaleString('vi-VN') : '—'}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <MaterialSymbol name="check_circle" filled />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Đang học</p>
            <h3 className="font-h2 text-h2 leading-none text-emerald-600">
              {stats ? stats.dangHoc.toLocaleString('vi-VN') : '—'}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <MaterialSymbol name="hourglass_top" filled />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tạm nghỉ</p>
            <h3 className="font-h2 text-h2 leading-none text-orange-600">
              {stats ? stats.tamNghi.toLocaleString('vi-VN') : '—'}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <MaterialSymbol name="block" filled />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Nghỉ học</p>
            <h3 className="font-h2 text-h2 leading-none text-rose-600">
              {stats ? stats.nghiHoc.toLocaleString('vi-VN') : '—'}
            </h3>
          </div>
        </div>
      </div>

      {statsEndpoint404 ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <MaterialSymbol name="info" className="flex-shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Thống kê nhanh không tải được (404)</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/85">
              Backend đang chạy bản chưa có{' '}
              <code className="rounded bg-amber-100/90 px-1 py-0.5 text-[11px]">GET /api/students/stats</code>. Các
              ô KPI hiển thị &quot;—&quot;; danh sách và thêm/sửa học sinh vẫn dùng bình thường. Hãy{' '}
              <strong>build lại</strong> <code className="text-[11px]">QuangTrung.Api</code> và{' '}
              <strong>tắt rồi chạy lại</strong> tiến trình API (tránh file DLL bị khóa khi build).
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-400">Lớp</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả các lớp</option>
            {classesAll.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-400">Trạng thái</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="0">Đang học</option>
            <option value="1">Tạm nghỉ</option>
            <option value="2">Nghỉ học</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 ml-1 block text-[10px] font-black uppercase text-slate-400">Tìm theo tên</label>
          <div className="relative">
            <MaterialSymbol
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Nhập tên học sinh..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex-none self-end pt-4">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            <MaterialSymbol name="filter_list" className="text-lg" />
            Lọc nâng cao
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Học sinh</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Ngày sinh</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Lớp hiện tại
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!schoolYearId ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Chưa có năm học trong hệ thống. Vui lòng cấu hình ở mục Năm học &amp; lớp.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Không có học sinh phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                list.map((row) => {
                  const initials = row.fullName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(-2)
                    .map((w) => w[0]!.toUpperCase())
                    .join('');
                  const st = row.status;
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-primary-fixed/20">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                            {initials || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{row.fullName}</p>
                            <p className="text-xs text-slate-500">ID: {displayStudentId(row)}</p>
                            {!row.registrationCode?.trim() ? (
                              <p className="mt-0.5 max-w-[220px] text-[10px] leading-snug text-slate-400">
                                Chưa có mã đăng ký — phụ huynh có thể dùng 8 ký tự này hoặc UUID đầy đủ khi đăng ký (nếu không trùng học sinh khác).
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[10px] text-slate-400">Dùng mã này trên form đăng ký phụ huynh.</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDob(row.dateOfBirth)}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {row.currentClassName?.trim() ? row.currentClassName : 'Chưa gán lớp'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {st === 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Đang học
                          </span>
                        ) : st === 1 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Tạm nghỉ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Nghỉ học
                          </span>
                        )}
                      </td>
                      <td className="relative px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {write ? (
                            <button
                              type="button"
                              onClick={() => openAssign(row)}
                              className="flex items-center gap-1 rounded-lg p-2 text-xs font-bold text-primary transition-colors hover:bg-primary-fixed"
                            >
                              <MaterialSymbol name="assignment_ind" className="text-lg" />
                              Gán lớp
                            </button>
                          ) : null}
                          {write ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setMenuRowId((v) => (v === row.id ? null : row.id))}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
                              >
                                <MaterialSymbol name="more_vert" />
                              </button>
                              {menuRowId === row.id ? (
                                <div className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                                  <button
                                    type="button"
                                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={() => void openEdit(row.id)}
                                  >
                                    Sửa thông tin
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                    onClick={() => void confirmDelete(row.id)}
                                  >
                                    Xóa học sinh
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {schoolYearId && !loading ? (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-500">
              Hiển thị {from}-{to} trong tổng số {totalCount.toLocaleString('vi-VN')} học sinh
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<number[]>((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1]! > 1) acc.push(-1);
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === -1 ? (
                    <span key={`e${i}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`h-8 w-8 rounded text-xs font-bold ${
                        n === page ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_right" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {menuRowId
        ? createPortal(
            <button
              type="button"
              className="fixed inset-0 z-[1180] cursor-default bg-transparent"
              aria-label="Đóng menu"
              onClick={() => setMenuRowId(null)}
            />,
            document.body,
          )
        : null}

      {assignOpen && assignStudent && schoolYearId ? (
        <ModalPortal
          open
          onClose={() => {
            if (assignSubmitting) return;
            closeAssign();
          }}
          lockBackdrop={assignSubmitting}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">Gán lớp học</h3>
                <p className="text-sm text-white/70">
                  {assignStudent.fullName} — ID: {displayStudentId(assignStudent)}
                </p>
              </div>
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={closeAssign}
                className="text-white/50 transition-colors hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Chọn khối lớp</label>
                  <div className="grid grid-cols-3 gap-3">
                    {grades.map((g) => {
                      const sel = assignGradeId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setAssignGradeId(g.id);
                            setAssignClassId('');
                          }}
                          className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-bold transition-all ${
                            sel
                              ? 'border-2 border-primary bg-primary-fixed/30 text-primary'
                              : 'border-2 border-slate-100 text-slate-500 hover:border-primary/30'
                          }`}
                        >
                          <MaterialSymbol name={gradeIcon(g.name)} className="text-xl" />
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Chọn lớp cụ thể</label>
                  <select
                    value={assignClassId}
                    onChange={(e) => setAssignClassId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Chọn lớp —</option>
                    {assignClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {assignClassId && assignCapacity != null && assignEnrolled != null ? (
                    <p className="mt-2 text-[11px] italic text-slate-400">
                      Sĩ số hiện tại của lớp {selectedAssignClassName || 'đã chọn'}: {assignEnrolled}/
                      {assignCapacity} học sinh
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <MaterialSymbol name="info" className="flex-shrink-0 text-blue-500" />
                  <p className="text-xs leading-relaxed text-blue-800">
                    Việc thay đổi lớp sẽ tự động cập nhật lại danh sách điểm danh và các khoản học phí theo quy định
                    của lớp mới từ tháng tiếp theo.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  disabled={assignSubmitting}
                  onClick={closeAssign}
                  className="flex-1 rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!assignClassId || assignSubmitting}
                  onClick={() => void submitAssign()}
                  className="flex-[2] rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-tertiary active:scale-95 disabled:opacity-50"
                >
                  {assignSubmitting ? 'Đang xử lý...' : 'Xác nhận gán lớp'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {upsertOpen ? (
        <ModalPortal
          open={upsertOpen}
          onClose={() => {
            if (upsertSubmitting || upsertLoading) return;
            closeUpsert();
          }}
          lockBackdrop={upsertSubmitting || upsertLoading}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-lg shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">{upsertMode === 'add' ? 'Thêm học sinh mới' : 'Sửa thông tin học sinh'}</h3>
                <p className="text-sm text-white/70">
                  {upsertMode === 'add' ? 'Nhập đầy đủ thông tin để tạo hồ sơ mới.' : 'Cập nhật thông tin và trạng thái.'}
                </p>
              </div>
              <button
                type="button"
                disabled={upsertSubmitting}
                onClick={closeUpsert}
                className="text-white/50 transition-colors hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="p-6">
              {upsertLoading ? (
                <p className="py-8 text-center text-slate-500">Đang tải...</p>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Họ và tên</label>
                      <input
                        value={upsertForm.fullName}
                        onChange={(e) => setUpsertForm((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Giới tính</label>
                        <select
                          value={upsertForm.gender}
                          onChange={(e) => setUpsertForm((f) => ({ ...f, gender: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          <option value={0}>Chưa rõ</option>
                          <option value={1}>Nam</option>
                          <option value={2}>Nữ</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ngày sinh</label>
                        <input
                          type="date"
                          value={upsertForm.dateOfBirth}
                          onChange={(e) => setUpsertForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Trạng thái</label>
                      <select
                        value={upsertForm.status}
                        onChange={(e) => setUpsertForm((f) => ({ ...f, status: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value={0}>Đang học</option>
                        <option value={1}>Tạm nghỉ</option>
                        <option value={2}>Nghỉ học</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Địa chỉ</label>
                      <input
                        value={upsertForm.address}
                        onChange={(e) => setUpsertForm((f) => ({ ...f, address: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ghi chú sức khỏe</label>
                      <textarea
                        value={upsertForm.healthNote}
                        onChange={(e) => setUpsertForm((f) => ({ ...f, healthNote: e.target.value }))}
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Dị ứng / lưu ý</label>
                      <textarea
                        value={upsertForm.allergyNote}
                        onChange={(e) => setUpsertForm((f) => ({ ...f, allergyNote: e.target.value }))}
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      disabled={upsertSubmitting}
                      onClick={closeUpsert}
                      className="flex-1 rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={upsertSubmitting || !upsertForm.fullName.trim() || !upsertForm.dateOfBirth}
                      onClick={() => void submitUpsert()}
                      className="flex-[2] rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-tertiary active:scale-95 disabled:opacity-50"
                    >
                      {upsertSubmitting ? 'Đang lưu...' : upsertMode === 'add' ? 'Tạo hồ sơ' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
