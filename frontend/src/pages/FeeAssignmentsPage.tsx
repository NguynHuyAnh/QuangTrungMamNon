import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createStudentFeeAssignment,
  deleteStudentFeeAssignment,
  getFeeStructuresPaged,
  getSchoolYearsPaged,
  getStudentFeeAssignmentsPaged,
  getStudentsBillingView,
  updateStudentFeeAssignment,
  type FeeStructureRow,
  type SchoolYearRow,
  type StudentBillingRow,
  type StudentFeeAssignmentRow,
  type UpsertStudentFeeAssignmentBody,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 12;

function canReadFees(roles: string[]) {
  return roles.some((r) => r === 'KeToan' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function canWriteFees(roles: string[]) {
  return roles.some((r) => r === 'KeToan' || r === 'SuperAdmin');
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function monthLabel(m: number): string {
  if (m < 1 || m > 12) return `Tháng ${m}`;
  return `Tháng ${m}`;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));

function parseMoneyInput(raw: string): number | null {
  const s = raw.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function FeeAssignmentsPage() {
  const { accessToken, roles } = useAuth();
  const readPerm = canReadFees(roles);
  const writePerm = canWriteFees(roles);

  const [years, setYears] = useState<SchoolYearRow[]>([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StudentFeeAssignmentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [studentOptions, setStudentOptions] = useState<StudentBillingRow[]>([]);
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [studentSearchDebounced, setStudentSearchDebounced] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [feeOptions, setFeeOptions] = useState<FeeStructureRow[]>([]);
  const [form, setForm] = useState({
    studentId: '',
    schoolYearId: '',
    feeStructureId: '',
    month: 1,
    amountOverride: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setStudentSearchDebounced(studentSearchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [studentSearchInput]);

  useEffect(() => {
    setPage(1);
  }, [schoolYearId, filterStudentId, filterMonth]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const loadYears = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    try {
      const r = await getSchoolYearsPaged(accessToken, { pageSize: 100 });
      setYears(r.items);
      setSchoolYearId((prev) => {
        if (prev && r.items.some((y) => y.id === prev)) return prev;
        const cur = r.items.find((y) => y.isCurrent);
        return cur?.id ?? r.items[0]?.id ?? '';
      });
    } catch {
      setYears([]);
    }
  }, [accessToken, readPerm]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  const yearNameById = useMemo(() => Object.fromEntries(years.map((y) => [y.id, y.name])), [years]);

  const loadStudentOptions = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    try {
      const r = await getStudentsBillingView(accessToken, {
        q: studentSearchDebounced || undefined,
        pageSize: 200,
        page: 1,
      });
      setStudentOptions(r.items);
    } catch {
      setStudentOptions([]);
    }
  }, [accessToken, readPerm, studentSearchDebounced]);

  useEffect(() => {
    if (!readPerm || !accessToken) return;
    void loadStudentOptions();
  }, [readPerm, accessToken, loadStudentOptions]);

  const loadFeeOptionsForYear = useCallback(
    async (yearId: string) => {
      if (!accessToken || !readPerm || !yearId) {
        setFeeOptions([]);
        return;
      }
      try {
        const r = await getFeeStructuresPaged(accessToken, { schoolYearId: yearId, pageSize: 200 });
        setFeeOptions(r.items);
      } catch {
        setFeeOptions([]);
      }
    },
    [accessToken, readPerm],
  );

  const listParams = useMemo(
    () => ({
      schoolYearId: schoolYearId || undefined,
      studentId: filterStudentId || undefined,
      month: filterMonth === '' ? undefined : Number(filterMonth),
      page,
      pageSize: PAGE_SIZE,
    }),
    [schoolYearId, filterStudentId, filterMonth, page],
  );

  const refreshList = useCallback(async () => {
    if (!accessToken || !readPerm) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getStudentFeeAssignmentsPaged(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được gán phí.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, readPerm, listParams]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  const openCreate = () => {
    setError(null);
    setEditId(null);
    const y = schoolYearId || years[0]?.id || '';
    setForm({
      studentId: filterStudentId || studentOptions[0]?.id || '',
      schoolYearId: y,
      feeStructureId: '',
      month: new Date().getMonth() + 1,
      amountOverride: '',
    });
    setModalOpen(true);
    void loadFeeOptionsForYear(y);
  };

  const openEdit = (row: StudentFeeAssignmentRow) => {
    setError(null);
    setEditId(row.id);
    setForm({
      studentId: row.studentId,
      schoolYearId: row.schoolYearId,
      feeStructureId: row.feeStructureId,
      month: row.month,
      amountOverride: row.amountOverride != null ? String(row.amountOverride) : '',
    });
    setStudentOptions((prev) => {
      if (prev.some((s) => s.id === row.studentId)) return prev;
      return [
        {
          id: row.studentId,
          fullName: row.studentFullName,
          dateOfBirth: '',
          status: 0,
          registrationCode: null,
          currentClassName: null,
        },
        ...prev,
      ];
    });
    setModalOpen(true);
    void loadFeeOptionsForYear(row.schoolYearId);
  };

  useEffect(() => {
    if (!modalOpen || !form.schoolYearId) return;
    void loadFeeOptionsForYear(form.schoolYearId);
  }, [modalOpen, form.schoolYearId, loadFeeOptionsForYear]);

  const submitForm = async () => {
    if (!accessToken || !writePerm) return;
    if (!form.studentId || !form.schoolYearId || !form.feeStructureId) {
      setError('Chọn đủ học sinh, năm học và biểu phí.');
      return;
    }
    if (form.month < 1 || form.month > 12) {
      setError('Tháng không hợp lệ.');
      return;
    }
    const overrideRaw = form.amountOverride.trim();
    const amountOverride = overrideRaw === '' ? null : parseMoneyInput(overrideRaw);
    if (overrideRaw !== '' && amountOverride === null) {
      setError('Số tiền ghi đè không hợp lệ (để trống nếu dùng đúng biểu phí).');
      return;
    }
    const body: UpsertStudentFeeAssignmentBody = {
      studentId: form.studentId,
      schoolYearId: form.schoolYearId,
      feeStructureId: form.feeStructureId,
      month: form.month,
      amountOverride,
    };
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await updateStudentFeeAssignment(accessToken, editId, body);
        setSuccessMessage('Đã cập nhật gán phí.');
      } else {
        await createStudentFeeAssignment(accessToken, body);
        setSuccessMessage('Đã thêm gán phí.');
      }
      setModalOpen(false);
      setEditId(null);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: string) => {
    if (!accessToken || !writePerm) return;
    if (!window.confirm('Xóa gán phí này?')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteStudentFeeAssignment(accessToken, id);
      setSuccessMessage('Đã xóa gán phí.');
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!readPerm) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-h1 text-primary">Gán phí học sinh</h1>
          <p className="mt-1 text-on-surface-variant">Gắn biểu phí theo tháng cho từng học sinh.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-amber-900">
          <MaterialSymbol name="lock" className="mx-auto mb-3 text-4xl opacity-70" />
          <p className="font-semibold">Tài khoản không có quyền</p>
          <p className="mt-2 text-sm text-amber-800/90">
            Chỉ <strong>Kế toán</strong>, <strong>Ban giám hiệu</strong> hoặc <strong>SuperAdmin</strong> được truy cập.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-h1 text-primary">Gán phí học sinh</h1>
          <p className="mt-1 text-on-surface-variant">
            Theo năm học và tháng — dùng cho thu phí / đối soát
            {schoolYearId ? (
              <span className="text-slate-400"> · {yearNameById[schoolYearId] ?? 'Năm học'}</span>
            ) : null}
          </p>
        </div>
        {writePerm ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-tertiary"
          >
            <MaterialSymbol name="add" />
            Thêm gán phí
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Năm học</label>
          <select
            value={schoolYearId}
            onChange={(e) => setSchoolYearId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {years.length === 0 ? <option value="">—</option> : null}
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent ? ' (hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Tháng</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={String(m.value)}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-[2]">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Học sinh (lọc)</label>
          <div className="space-y-1">
            <input
              type="search"
              value={studentSearchInput}
              onChange={(e) => setStudentSearchInput(e.target.value)}
              placeholder="Gõ tên để tìm trong danh sách..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Tất cả học sinh</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!writePerm ? (
          <p className="text-xs text-slate-500 lg:max-w-xs">
            Quyền <strong>Ban giám hiệu</strong>: chỉ xem. Thêm / sửa / xóa do Kế toán hoặc SuperAdmin.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Danh sách gán phí
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có bản ghi phù hợp.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                    <MaterialSymbol name="assignment" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-on-background">{row.studentFullName}</p>
                    <p className="text-xs text-slate-500">
                      {row.feeStructureName} · {monthLabel(row.month)} · {yearNameById[row.schoolYearId] ?? 'Năm học'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{formatVnd(row.resolvedAmount)}</p>
                    {row.amountOverride != null ? (
                      <p className="text-[10px] text-slate-500">Ghi đè: {formatVnd(row.amountOverride)}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">Theo biểu phí</p>
                    )}
                  </div>
                  {writePerm ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => void doDelete(row.id)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {deletingId === row.id ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && totalCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">
              Hiển thị {from}-{to} / {totalCount.toLocaleString('vi-VN')}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs text-slate-600">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <ModalPortal
          open={modalOpen}
          onClose={() => {
            if (saving) return;
            setModalOpen(false);
            setEditId(null);
          }}
          lockBackdrop={saving}
          backdropClassName="bg-black/40 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-lg shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-primary">{editId ? 'Sửa gán phí' : 'Thêm gán phí'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Học sinh</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">— Chọn —</option>
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">Dùng ô tìm kiếm phía trên để nạp danh sách.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Năm học</label>
                <select
                  value={form.schoolYearId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      schoolYearId: e.target.value,
                      feeStructureId: '',
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Biểu phí</label>
                <select
                  value={form.feeStructureId}
                  onChange={(e) => setForm((f) => ({ ...f, feeStructureId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">— Chọn khoản thu —</option>
                  {feeOptions.map((fee) => (
                    <option key={fee.id} value={fee.id}>
                      {fee.name} ({formatVnd(fee.amount)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Tháng áp dụng</label>
                <select
                  value={form.month}
                  onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Số tiền ghi đè (tuỳ chọn)</label>
                <input
                  value={form.amountOverride}
                  onChange={(e) => setForm((f) => ({ ...f, amountOverride: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Để trống = dùng số tiền trong biểu phí"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setModalOpen(false);
                  setEditId(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitForm()}
                className="flex-1 rounded-xl bg-primary py-3 font-bold text-white hover:bg-tertiary disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
