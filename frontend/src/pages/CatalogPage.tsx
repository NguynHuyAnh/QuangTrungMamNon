import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  createClass,
  createGrade,
  createSchoolYear,
  deleteClass,
  deleteGrade,
  deleteSchoolYear,
  getClassesPaged,
  getClassById,
  getGradeById,
  getGradesPaged,
  getHomeroomOptions,
  getSchoolYearById,
  getSchoolYearsPaged,
  updateClass,
  updateGrade,
  updateSchoolYear,
  type ClassRow,
  type GradeRow,
  type SchoolYearRow,
  type UpsertClassBody,
  type UpsertGradeBody,
  type UpsertSchoolYearBody,
  type UserOptionRow,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canStaffAccessCatalogNav } from '../auth/staffNavAccess';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const CLASS_PAGE_SIZE = 15;

function canWriteCatalog(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type Tab = 'years' | 'grades' | 'classes';

export function CatalogPage() {
  const { accessToken, roles } = useAuth();
  const write = canWriteCatalog(roles);

  const [tab, setTab] = useState<Tab>('classes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [years, setYears] = useState<SchoolYearRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classTotal, setClassTotal] = useState(0);
  const [classPage, setClassPage] = useState(1);
  const [homeroomOptions, setHomeroomOptions] = useState<UserOptionRow[]>([]);

  const [filterYearId, setFilterYearId] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [qClassesInput, setQClassesInput] = useState('');
  const [qClasses, setQClasses] = useState('');
  const [qYearsInput, setQYearsInput] = useState('');
  const [qYears, setQYears] = useState('');
  const [qGradesInput, setQGradesInput] = useState('');
  const [qGrades, setQGrades] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setQClasses(qClassesInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qClassesInput]);
  useEffect(() => {
    const t = window.setTimeout(() => setQYears(qYearsInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qYearsInput]);
  useEffect(() => {
    const t = window.setTimeout(() => setQGrades(qGradesInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qGradesInput]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 6000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const yearNameById = useMemo(() => Object.fromEntries(years.map((y) => [y.id, y.name])), [years]);
  const gradeNameById = useMemo(() => Object.fromEntries(grades.map((g) => [g.id, g.name])), [grades]);
  const homeroomNameById = useMemo(
    () => Object.fromEntries(homeroomOptions.map((u) => [u.id, u.fullName])),
    [homeroomOptions],
  );

  const currentYear = useMemo(() => years.find((y) => y.isCurrent) ?? null, [years]);
  const totalClassesInFilter = classTotal;
  const avgCapacity =
    classes.length > 0 ? Math.round(classes.reduce((s, c) => s + c.capacity, 0) / classes.length) : null;

  const loadYears = useCallback(async () => {
    if (!accessToken) return;
    const r = await getSchoolYearsPaged(accessToken, { q: qYears || undefined, pageSize: 100 });
    setYears(r.items);
    setFilterYearId((prev) => {
      if (prev && r.items.some((y) => y.id === prev)) return prev;
      const cur = r.items.find((y) => y.isCurrent);
      return cur?.id ?? r.items[0]?.id ?? '';
    });
  }, [accessToken, qYears]);

  const loadGrades = useCallback(async () => {
    if (!accessToken) return;
    const r = await getGradesPaged(accessToken, { q: qGrades || undefined, pageSize: 100 });
    setGrades(r.items);
  }, [accessToken, qGrades]);

  const loadClasses = useCallback(async () => {
    if (!accessToken || !filterYearId) {
      setClasses([]);
      setClassTotal(0);
      return;
    }
    const r = await getClassesPaged(accessToken, {
      schoolYearId: filterYearId,
      gradeId: filterGradeId || undefined,
      q: qClasses || undefined,
      page: classPage,
      pageSize: CLASS_PAGE_SIZE,
    });
    setClasses(r.items);
    setClassTotal(r.totalCount);
  }, [accessToken, filterYearId, filterGradeId, qClasses, classPage]);

  const loadHomeroom = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await getHomeroomOptions(accessToken);
      setHomeroomOptions(list);
    } catch {
      setHomeroomOptions([]);
    }
  }, [accessToken]);

  const refreshAll = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadYears(), loadGrades(), loadHomeroom()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh mục.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, loadYears, loadGrades, loadHomeroom]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!accessToken || !filterYearId) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadClasses();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được danh sách lớp.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, filterYearId, filterGradeId, qClasses, classPage, loadClasses]);

  useEffect(() => {
    setClassPage(1);
  }, [filterYearId, filterGradeId, qClasses]);

  const [yearModal, setYearModal] = useState(false);
  const [yearEditId, setYearEditId] = useState<string | null>(null);
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [yearSaving, setYearSaving] = useState(false);

  const openYearAdd = () => {
    setYearEditId(null);
    setYearForm({ name: '', startDate: '', endDate: '', isCurrent: false });
    setYearModal(true);
    setError(null);
  };
  const openYearEdit = async (id: string) => {
    if (!accessToken) return;
    setError(null);
    try {
      const r = await getSchoolYearById(accessToken, id);
      setYearEditId(id);
      setYearForm({
        name: r.name,
        startDate: r.startDate,
        endDate: r.endDate,
        isCurrent: r.isCurrent,
      });
      setYearModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được năm học.');
    }
  };
  const saveYear = async () => {
    if (!accessToken || !yearForm.name.trim() || !yearForm.startDate || !yearForm.endDate) return;
    setYearSaving(true);
    setError(null);
    const body: UpsertSchoolYearBody = {
      name: yearForm.name.trim(),
      startDate: yearForm.startDate,
      endDate: yearForm.endDate,
      isCurrent: yearForm.isCurrent,
    };
    try {
      if (yearEditId) await updateSchoolYear(accessToken, yearEditId, body);
      else await createSchoolYear(accessToken, body);
      setSuccessMessage(yearEditId ? 'Đã cập nhật năm học.' : 'Đã thêm năm học.');
      setYearModal(false);
      await refreshAll();
      await loadClasses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu năm học thất bại.');
    } finally {
      setYearSaving(false);
    }
  };
  const removeYear = async (id: string) => {
    if (!accessToken || !window.confirm('Xóa năm học này? Các lớp gắn năm vẫn giữ Id — chỉ ẩn năm khỏi danh sách.')) return;
    try {
      await deleteSchoolYear(accessToken, id);
      setSuccessMessage('Đã xóa năm học.');
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    }
  };

  const [gradeModal, setGradeModal] = useState(false);
  const [gradeEditId, setGradeEditId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ name: '', sortOrder: 1 });
  const [gradeSaving, setGradeSaving] = useState(false);

  const openGradeAdd = () => {
    setGradeEditId(null);
    setGradeForm({ name: '', sortOrder: grades.length ? grades[grades.length - 1]!.sortOrder + 1 : 1 });
    setGradeModal(true);
    setError(null);
  };
  const openGradeEdit = async (id: string) => {
    if (!accessToken) return;
    setError(null);
    try {
      const r = await getGradeById(accessToken, id);
      setGradeEditId(id);
      setGradeForm({ name: r.name, sortOrder: r.sortOrder });
      setGradeModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được khối.');
    }
  };
  const saveGrade = async () => {
    if (!accessToken || !gradeForm.name.trim()) return;
    setGradeSaving(true);
    setError(null);
    const body: UpsertGradeBody = { name: gradeForm.name.trim(), sortOrder: Number(gradeForm.sortOrder) || 0 };
    try {
      if (gradeEditId) await updateGrade(accessToken, gradeEditId, body);
      else await createGrade(accessToken, body);
      setSuccessMessage(gradeEditId ? 'Đã cập nhật khối.' : 'Đã thêm khối.');
      setGradeModal(false);
      await loadGrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu khối thất bại.');
    } finally {
      setGradeSaving(false);
    }
  };
  const removeGrade = async (id: string) => {
    if (!accessToken || !window.confirm('Xóa khối này? Chỉ thực hiện khi không còn lớp dùng khối.')) return;
    try {
      await deleteGrade(accessToken, id);
      setSuccessMessage('Đã xóa khối.');
      await loadGrades();
      await loadClasses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại (có thể còn lớp đang dùng khối).');
    }
  };

  const [classModal, setClassModal] = useState(false);
  const [classEditId, setClassEditId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState({
    schoolYearId: '',
    gradeId: '',
    name: '',
    capacity: 25,
    homeroomTeacherId: '' as string,
  });
  const [classSaving, setClassSaving] = useState(false);

  const openClassAdd = () => {
    setClassEditId(null);
    setClassForm({
      schoolYearId: filterYearId || years[0]?.id || '',
      gradeId: grades[0]?.id || '',
      name: '',
      capacity: 25,
      homeroomTeacherId: '',
    });
    setClassModal(true);
    setError(null);
  };
  const openClassEdit = async (id: string) => {
    if (!accessToken) return;
    setError(null);
    try {
      const r = await getClassById(accessToken, id);
      setClassEditId(id);
      setClassForm({
        schoolYearId: r.schoolYearId,
        gradeId: r.gradeId,
        name: r.name,
        capacity: r.capacity,
        homeroomTeacherId: r.homeroomTeacherId ?? '',
      });
      setClassModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lớp.');
    }
  };
  const saveClass = async () => {
    if (!accessToken || !classForm.name.trim() || !classForm.schoolYearId || !classForm.gradeId) return;
    setClassSaving(true);
    setError(null);
    const body: UpsertClassBody = {
      schoolYearId: classForm.schoolYearId,
      gradeId: classForm.gradeId,
      name: classForm.name.trim(),
      capacity: Math.max(1, Number(classForm.capacity) || 1),
      homeroomTeacherId: classForm.homeroomTeacherId || null,
    };
    try {
      if (classEditId) await updateClass(accessToken, classEditId, body);
      else await createClass(accessToken, body);
      setSuccessMessage(classEditId ? 'Đã cập nhật lớp.' : 'Đã thêm lớp.');
      setClassModal(false);
      await loadClasses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu lớp thất bại.');
    } finally {
      setClassSaving(false);
    }
  };
  const removeClass = async (id: string) => {
    if (!accessToken || !window.confirm('Xóa lớp này?')) return;
    try {
      await deleteClass(accessToken, id);
      setSuccessMessage('Đã xóa lớp.');
      await loadClasses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    }
  };

  const classTotalPages = Math.max(1, Math.ceil(classTotal / CLASS_PAGE_SIZE));
  const classFrom = classTotal === 0 ? 0 : (classPage - 1) * CLASS_PAGE_SIZE + 1;
  const classTo = Math.min(classPage * CLASS_PAGE_SIZE, classTotal);

  const primaryActionLabel =
    tab === 'classes' ? 'Thêm lớp mới' : tab === 'grades' ? 'Thêm khối' : 'Thêm năm học';

  if (!canStaffAccessCatalogNav(roles)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <>
      <div className="mb-8 flex min-w-0 flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="min-w-0">
          <h2 className="mb-2 font-h1 text-primary">Năm học &amp; lớp</h2>
          <p className="font-body-md text-on-surface-variant">
            Cấu hình năm học, khối / cấp và lớp — đồng bộ với điểm danh, học phí và phân công học sinh.
          </p>
        </div>
        <div className="flex w-full max-w-full flex-wrap gap-1 rounded-xl bg-surface-container p-1 shadow-inner sm:inline-flex sm:w-auto sm:flex-nowrap">
          {(
            [
              ['classes', 'Lớp học'],
              ['grades', 'Khối'],
              ['years', 'Năm học'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`min-w-0 flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-bold transition-all sm:flex-none sm:px-5 ${
                tab === k ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="pt-0.5">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Đóng"
          >
            <MaterialSymbol name="close" className="text-lg" />
          </button>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="flex items-center gap-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <MaterialSymbol name="school" className="text-3xl" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Số lớp (bộ lọc)</p>
            <p className="text-2xl font-black text-primary">
              {filterYearId ? totalClassesInFilter.toLocaleString('vi-VN') : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <MaterialSymbol name="groups" className="text-3xl" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sĩ số TB (trang hiện tại)</p>
            <p className="text-2xl font-black text-primary">{avgCapacity ?? '—'}</p>
          </div>
        </div>
        <div className="relative flex items-center justify-between overflow-hidden rounded-xl bg-gradient-to-br from-[#0B3D91] to-[#1E40AF] p-6 text-white shadow-lg md:col-span-2">
          <div className="z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Năm học hiện tại</p>
            <p className="text-2xl font-black">{currentYear?.name ?? '—'}</p>
            <p className="mt-1 text-sm text-white/80">
              {currentYear
                ? `${formatDate(currentYear.startDate)} → ${formatDate(currentYear.endDate)}`
                : 'Chưa đánh dấu năm hiện tại'}
            </p>
          </div>
          <MaterialSymbol
            name="calendar_month"
            className="pointer-events-none absolute -bottom-6 -right-4 select-none text-[120px] text-white/10"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex min-w-0 flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6 md:flex-row md:flex-wrap md:items-center">
          <div className="flex min-w-0 flex-[1_1_240px] flex-wrap items-center gap-3">
            {tab === 'classes' ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Năm:</span>
                  <select
                    value={filterYearId}
                    onChange={(e) => setFilterYearId(e.target.value)}
                    className="max-w-[200px] cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-primary focus:ring-0"
                  >
                    <option value="">— Chọn năm —</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                        {y.isCurrent ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Khối:</span>
                  <select
                    value={filterGradeId}
                    onChange={(e) => setFilterGradeId(e.target.value)}
                    className="max-w-[200px] cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-primary focus:ring-0"
                  >
                    <option value="">Tất cả khối</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative min-w-0 w-full sm:w-auto">
                  <MaterialSymbol
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={qClassesInput}
                    onChange={(e) => setQClassesInput(e.target.value)}
                    placeholder="Tìm tên lớp..."
                    className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:w-56"
                  />
                </div>
              </>
            ) : tab === 'grades' ? (
              <div className="relative min-w-0 w-full sm:w-auto">
                <MaterialSymbol
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={qGradesInput}
                  onChange={(e) => setQGradesInput(e.target.value)}
                  placeholder="Tìm tên khối..."
                  className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:w-64"
                />
              </div>
            ) : (
              <div className="relative min-w-0 w-full sm:w-auto">
                <MaterialSymbol
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={qYearsInput}
                  onChange={(e) => setQYearsInput(e.target.value)}
                  placeholder="Tìm tên năm học..."
                  className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:w-64"
                />
              </div>
            )}
          </div>
          {write ? (
            <button
              type="button"
              onClick={() => {
                if (tab === 'classes') void openClassAdd();
                else if (tab === 'grades') void openGradeAdd();
                else void openYearAdd();
              }}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-bold text-white shadow-md transition-all hover:bg-tertiary active:scale-95 sm:w-auto md:justify-start"
            >
              <MaterialSymbol name="add" />
              {primaryActionLabel}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-6 py-12 text-center text-slate-500">Đang tải...</p>
          ) : tab === 'years' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tên năm học</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Bắt đầu</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kết thúc</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Hiện tại</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {years.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Chưa có năm học.
                    </td>
                  </tr>
                ) : (
                  years.map((y) => (
                    <tr key={y.id} className="hover:bg-primary-fixed/20">
                      <td className="px-6 py-4 font-bold text-slate-800">{y.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(y.startDate)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(y.endDate)}</td>
                      <td className="px-6 py-4">
                        {y.isCurrent ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            Đang dùng
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {write ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openYearEdit(y.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary-fixed"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeYear(y.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : tab === 'grades' ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tên khối</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Thứ tự</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                      Chưa có khối.
                    </td>
                  </tr>
                ) : (
                  grades.map((g) => (
                    <tr key={g.id} className="hover:bg-primary-fixed/20">
                      <td className="px-6 py-4 font-bold text-slate-800">{g.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{g.sortOrder}</td>
                      <td className="px-6 py-4 text-right">
                        {write ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openGradeEdit(g.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary-fixed"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeGrade(g.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tên lớp</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Năm học</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Khối</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Sĩ số tối đa</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">GVCN</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!filterYearId ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Chọn năm học để xem danh sách lớp.
                    </td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Không có lớp phù hợp.
                    </td>
                  </tr>
                ) : (
                  classes.map((c) => (
                    <tr key={c.id} className="hover:bg-primary-fixed/20">
                      <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{yearNameById[c.schoolYearId] ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{gradeNameById[c.gradeId] ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{c.capacity}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {c.homeroomTeacherId ? homeroomNameById[c.homeroomTeacherId] ?? c.homeroomTeacherId : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {write ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openClassEdit(c.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary-fixed"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeClass(c.id)}
                              className="rounded-lg px-3 py-1.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {tab === 'classes' && filterYearId && !loading ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-500">
              Hiển thị {classFrom}-{classTo} / {classTotal.toLocaleString('vi-VN')} lớp
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={classPage <= 1}
                onClick={() => setClassPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_left" />
              </button>
              <span className="px-2 text-sm font-semibold text-slate-600">
                {classPage} / {classTotalPages}
              </span>
              <button
                type="button"
                disabled={classPage >= classTotalPages}
                onClick={() => setClassPage((p) => Math.min(classTotalPages, p + 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_right" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {yearModal ? (
        <ModalPortal
          open={yearModal}
          onClose={() => {
            if (yearSaving) return;
            setYearModal(false);
          }}
          lockBackdrop={yearSaving}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
          <div className="w-full rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">{yearEditId ? 'Sửa năm học' : 'Thêm năm học'}</h3>
                <p className="text-sm text-white/70">Tên, khoảng thời gian và cờ &quot;năm hiện tại&quot;.</p>
              </div>
              <button
                type="button"
                disabled={yearSaving}
                onClick={() => setYearModal(false)}
                className="text-white/50 hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tên năm</label>
                <input
                  value={yearForm.name}
                  onChange={(e) => setYearForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="2025-2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Bắt đầu</label>
                  <input
                    type="date"
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Kết thúc</label>
                  <input
                    type="date"
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={yearForm.isCurrent}
                  onChange={(e) => setYearForm((f) => ({ ...f, isCurrent: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold text-slate-700">Đặt làm năm học hiện tại</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={yearSaving}
                  onClick={() => setYearModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={yearSaving}
                  onClick={() => void saveYear()}
                  className="flex-[2] rounded-xl bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 hover:bg-tertiary disabled:opacity-50"
                >
                  {yearSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {gradeModal ? (
        <ModalPortal
          open={gradeModal}
          onClose={() => {
            if (gradeSaving) return;
            setGradeModal(false);
          }}
          lockBackdrop={gradeSaving}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
          <div className="w-full rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">{gradeEditId ? 'Sửa khối' : 'Thêm khối'}</h3>
                <p className="text-sm text-white/70">Ví dụ: Mẫu giá, Mầm, Chồi, Lá...</p>
              </div>
              <button
                type="button"
                disabled={gradeSaving}
                onClick={() => setGradeModal(false)}
                className="text-white/50 hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tên khối</label>
                <input
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Thứ tự hiển thị</label>
                <input
                  type="number"
                  min={0}
                  value={gradeForm.sortOrder}
                  onChange={(e) => setGradeForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={gradeSaving}
                  onClick={() => setGradeModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={gradeSaving}
                  onClick={() => void saveGrade()}
                  className="flex-[2] rounded-xl bg-primary py-3 font-bold text-white shadow-lg hover:bg-tertiary disabled:opacity-50"
                >
                  {gradeSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {classModal ? (
        <ModalPortal
          open={classModal}
          onClose={() => {
            if (classSaving) return;
            setClassModal(false);
          }}
          lockBackdrop={classSaving}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-lg shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">{classEditId ? 'Sửa lớp' : 'Thêm lớp'}</h3>
                <p className="text-sm text-white/70">Gắn năm học, khối và giáo viên chủ nhiệm (tuỳ chọn).</p>
              </div>
              <button
                type="button"
                disabled={classSaving}
                onClick={() => setClassModal(false)}
                className="text-white/50 hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Năm học</label>
                <select
                  value={classForm.schoolYearId}
                  onChange={(e) => setClassForm((f) => ({ ...f, schoolYearId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Khối</label>
                <select
                  value={classForm.gradeId}
                  onChange={(e) => setClassForm((f) => ({ ...f, gradeId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tên lớp</label>
                <input
                  value={classForm.name}
                  onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="MG 4 tuổi A"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sĩ số tối đa</label>
                <input
                  type="number"
                  min={1}
                  value={classForm.capacity}
                  onChange={(e) => setClassForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Giáo viên chủ nhiệm</label>
                <select
                  value={classForm.homeroomTeacherId}
                  onChange={(e) => setClassForm((f) => ({ ...f, homeroomTeacherId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Chưa chọn —</option>
                  {homeroomOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={classSaving}
                  onClick={() => setClassModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={classSaving}
                  onClick={() => void saveClass()}
                  className="flex-[2] rounded-xl bg-primary py-3 font-bold text-white shadow-lg hover:bg-tertiary disabled:opacity-50"
                >
                  {classSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
