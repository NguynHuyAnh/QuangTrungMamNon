import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPaymentsForFeeAssignments,
  getPaymentsPaged,
  getPaymentsSummary,
  getStudentFeeAssignmentsPaged,
  getStudentsBillingView,
  type PaymentRow,
  type StudentBillingRow,
  type StudentFeeAssignmentRow,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 12;

function canReadPayments(roles: string[]) {
  return roles.some((r) => r === 'KeToan' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function canWritePayments(roles: string[]) {
  return roles.some((r) => r === 'KeToan' || r === 'SuperAdmin');
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function methodLabel(m: number): string {
  if (m === 0) return 'Tiền mặt';
  if (m === 1) return 'Chuyển khoản';
  if (m === 2) return 'ZaloPay';
  return `Khác (${m})`;
}

function localDayStartIso(dateStr: string): string {
  const p = dateStr.split('-').map(Number);
  const y = p[0];
  const mo = p[1];
  const d = p[2];
  if (!y || !mo || !d) return dateStr;
  return new Date(y, mo - 1, d, 0, 0, 0, 0).toISOString();
}

function localDayEndIso(dateStr: string): string {
  const p = dateStr.split('-').map(Number);
  const y = p[0];
  const mo = p[1];
  const d = p[2];
  if (!y || !mo || !d) return dateStr;
  return new Date(y, mo - 1, d, 23, 59, 59, 999).toISOString();
}

function formatPaidAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Admin chỉ ghi nhận nộp trực tiếp; ZaloPay là kênh phụ huynh, vẫn hiện trong lịch sử qua `methodLabel`. */
const ADMIN_RECORD_METHOD_OPTIONS = [
  { value: 0, label: 'Tiền mặt' },
  { value: 1, label: 'Chuyển khoản' },
];

export function PaymentsPage() {
  const { accessToken, roles } = useAuth();
  const readPerm = canReadPayments(roles);
  const writePerm = canWritePayments(roles);

  const [filterStudentId, setFilterStudentId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaryAmount, setSummaryAmount] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [studentOptions, setStudentOptions] = useState<StudentBillingRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<PaymentRow | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    method: 0,
    receiptNumber: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [createModalStudentQuery, setCreateModalStudentQuery] = useState('');
  const [createModalStudentDebounced, setCreateModalStudentDebounced] = useState('');
  const [createModalStudentOptions, setCreateModalStudentOptions] = useState<StudentBillingRow[]>([]);
  const [feeLines, setFeeLines] = useState<StudentFeeAssignmentRow[]>([]);
  const [feeLinesLoading, setFeeLinesLoading] = useState(false);
  const [selectedFeeAssignmentIds, setSelectedFeeAssignmentIds] = useState<string[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setCreateModalStudentDebounced(createModalStudentQuery.trim()), 350);
    return () => window.clearTimeout(t);
  }, [createModalStudentQuery]);

  useEffect(() => {
    setPage(1);
  }, [filterStudentId, fromDate, toDate]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const filterApiParams = useMemo(() => {
    return {
      studentId: filterStudentId || undefined,
      from: fromDate ? localDayStartIso(fromDate) : undefined,
      to: toDate ? localDayEndIso(toDate) : undefined,
    };
  }, [filterStudentId, fromDate, toDate]);

  const listParams = useMemo(
    () => ({
      ...filterApiParams,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filterApiParams, page],
  );

  const loadStudentOptions = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    try {
      const r = await getStudentsBillingView(accessToken, {
        pageSize: 200,
        page: 1,
      });
      setStudentOptions(r.items);
    } catch {
      setStudentOptions([]);
    }
  }, [accessToken, readPerm]);

  useEffect(() => {
    if (!readPerm || !accessToken) return;
    void loadStudentOptions();
  }, [readPerm, accessToken, loadStudentOptions]);

  const loadCreateModalStudents = useCallback(async () => {
    if (!accessToken || !writePerm || !createOpen) return;
    try {
      const r = await getStudentsBillingView(accessToken, {
        q: createModalStudentDebounced || undefined,
        pageSize: 200,
        page: 1,
      });
      setCreateModalStudentOptions(r.items);
    } catch {
      setCreateModalStudentOptions([]);
    }
  }, [accessToken, writePerm, createOpen, createModalStudentDebounced]);

  useEffect(() => {
    if (!createOpen) return;
    void loadCreateModalStudents();
  }, [createOpen, loadCreateModalStudents]);

  const loadFeeLinesForStudent = useCallback(
    async (studentId: string) => {
      if (!accessToken || !studentId) {
        setFeeLines([]);
        return;
      }
      setFeeLinesLoading(true);
      try {
        const r = await getStudentFeeAssignmentsPaged(accessToken, {
          studentId,
          pageSize: 500,
          page: 1,
        });
        setFeeLines(r.items);
      } catch {
        setFeeLines([]);
      } finally {
        setFeeLinesLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!createOpen || !form.studentId) {
      setFeeLines([]);
      setSelectedFeeAssignmentIds([]);
      return;
    }
    void loadFeeLinesForStudent(form.studentId);
  }, [createOpen, form.studentId, loadFeeLinesForStudent]);

  useEffect(() => {
    setSelectedFeeAssignmentIds([]);
  }, [form.studentId]);

  const outstandingFeeLines = useMemo(
    () => feeLines.filter((r) => r.remainingAmount > 0.000001),
    [feeLines],
  );

  const selectedStudentCard = useMemo(
    () => createModalStudentOptions.find((s) => s.id === form.studentId),
    [createModalStudentOptions, form.studentId],
  );

  const selectedTotalVnd = useMemo(() => {
    const set = new Set(selectedFeeAssignmentIds);
    return outstandingFeeLines.filter((r) => set.has(r.id)).reduce((s, r) => s + r.remainingAmount, 0);
  }, [outstandingFeeLines, selectedFeeAssignmentIds]);

  const toggleFeeSelection = (id: string) => {
    setSelectedFeeAssignmentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllOutstanding = () => {
    setSelectedFeeAssignmentIds(outstandingFeeLines.map((r) => r.id));
  };

  const clearFeeSelection = () => setSelectedFeeAssignmentIds([]);

  const refreshSummary = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    setSummaryLoading(true);
    try {
      const s = await getPaymentsSummary(accessToken, filterApiParams);
      setSummaryAmount(s.totalAmount);
    } catch {
      setSummaryAmount(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [accessToken, readPerm, filterApiParams]);

  const refreshList = useCallback(async () => {
    if (!accessToken || !readPerm) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getPaymentsPaged(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thanh toán.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, readPerm, listParams]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  const openCreate = () => {
    setError(null);
    const sid = filterStudentId || '';
    const prefillName = sid ? (studentOptions.find((s) => s.id === sid)?.fullName ?? '') : '';
    setCreateModalStudentQuery(prefillName);
    setForm({
      studentId: sid,
      method: 0,
      receiptNumber: '',
      note: '',
    });
    setSelectedFeeAssignmentIds([]);
    setFeeLines([]);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!accessToken || !writePerm) return;
    if (!form.studentId) {
      setError('Chọn học sinh.');
      return;
    }
    if (selectedFeeAssignmentIds.length === 0) {
      setError('Chọn ít nhất một khoản phí còn nợ để ghi nhận.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { count } = await createPaymentsForFeeAssignments(accessToken, {
        studentId: form.studentId,
        method: form.method,
        receiptNumber: form.receiptNumber.trim() || null,
        note: form.note.trim() || null,
        studentFeeAssignmentIds: selectedFeeAssignmentIds,
      });
      setSuccessMessage(
        count === 1 ? 'Đã ghi nhận 1 thanh toán theo khoản đã chọn.' : `Đã ghi nhận ${count} thanh toán theo các khoản đã chọn.`,
      );
      setCreateOpen(false);
      setPage(1);
      await refreshList();
      await refreshSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ghi nhận thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (!readPerm) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-h1 text-primary">Thanh toán</h1>
          <p className="mt-1 text-on-surface-variant">Lịch sử thu tiền theo học sinh.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-amber-900">
          <MaterialSymbol name="lock" className="mx-auto mb-3 text-4xl opacity-70" />
          <p className="font-semibold">Tài khoản không có quyền</p>
          <p className="mt-2 text-sm text-amber-800/90">
            Chỉ <strong>Kế toán</strong>, <strong>Ban giám hiệu</strong> hoặc <strong>SuperAdmin</strong> được xem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-h1 text-primary">Thanh toán</h1>
          <p className="mt-1 text-on-surface-variant">
            Quản lý lịch sử và ghi nhận nộp trực tiếp (tiền mặt / chuyển khoản). Thanh toán qua ví ZaloPay do phụ huynh thực hiện — vẫn hiển thị trong danh sách khi đã đồng bộ.
          </p>
        </div>
        {writePerm ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-tertiary"
          >
            <MaterialSymbol name="add" />
            Ghi nhận thanh toán
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
      ) : null}

      <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tổng tiền (theo bộ lọc)</p>
        <p className="mt-1 text-2xl font-black text-emerald-900">
          {summaryLoading ? '…' : summaryAmount != null ? formatVnd(summaryAmount) : '—'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Cộng tất cả giao dịch khớp học sinh và khoảng ngày đã chọn. Xóa hai ô ngày để xem toàn bộ lịch sử, gồm cả thanh toán ZaloPay sau khi máy chủ đã đối soát với ZaloPay.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="min-w-[220px] flex-[2]">
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
        {!writePerm ? (
          <p className="text-xs text-slate-500 lg:max-w-xs">
            Quyền <strong>Ban giám hiệu</strong>: chỉ xem. Ghi nhận thanh toán do Kế toán / SuperAdmin.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Lịch sử giao dịch
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có giao dịch phù hợp.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setDetailRow(row)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                      <MaterialSymbol name="payments" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-on-background">{row.studentFullName}</p>
                      <p className="text-xs text-slate-500">
                        {formatPaidAt(row.paidAt)} · {methodLabel(row.method)}
                        {row.receiptNumber ? ` · Phiếu ${row.receiptNumber}` : ''}
                      </p>
                      {row.feeLineDescription ? (
                        <p className="mt-0.5 text-[11px] text-slate-600">{row.feeLineDescription}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-800">
                    {formatVnd(row.amount)}
                  </span>
                </button>
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

      {createOpen ? (
        <ModalPortal
          open={createOpen}
          onClose={() => {
            if (saving) return;
            setCreateOpen(false);
          }}
          lockBackdrop={saving}
          backdropClassName="bg-black/50 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-xl shrink-0"
        >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-create-title"
                className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              >
            <h2 id="payment-create-title" className="text-lg font-bold text-primary">
              Ghi nhận thanh toán
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Chọn học sinh, tick các khoản phí còn nợ (đã gán trong hệ thống). Số tiền lấy đúng phần còn lại từng dòng — không nhập tay để tránh thừa/thiếu.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Tìm học sinh</label>
                <input
                  type="search"
                  value={createModalStudentQuery}
                  onChange={(e) => setCreateModalStudentQuery(e.target.value)}
                  placeholder="Gõ tên học sinh..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Học sinh</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">— Chọn học sinh —</option>
                  {createModalStudentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                      {s.currentClassName ? ` · ${s.currentClassName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {form.studentId ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Đang thu từ</p>
                  <p className="mt-1 font-bold text-on-background">
                    {selectedStudentCard?.fullName ?? 'Học sinh đã chọn'}
                  </p>
                  <dl className="mt-2 grid gap-1 text-xs text-slate-600">
                    {selectedStudentCard?.registrationCode ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-semibold text-slate-500">Mã:</dt>
                        <dd>{selectedStudentCard.registrationCode}</dd>
                      </div>
                    ) : null}
                    {selectedStudentCard?.currentClassName ? (
                      <div className="flex flex-wrap gap-1">
                        <dt className="font-semibold text-slate-500">Lớp:</dt>
                        <dd>{selectedStudentCard.currentClassName}</dd>
                      </div>
                    ) : (
                      <p className="text-slate-500">Chưa có lớp hiện tại trên hệ thống.</p>
                    )}
                  </dl>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-600">Khoản phí còn nợ</label>
                  {form.studentId && outstandingFeeLines.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={selectAllOutstanding}
                        className="text-[11px] font-bold uppercase tracking-wide text-primary hover:underline"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={clearFeeSelection}
                        className="text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:underline"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  ) : null}
                </div>
                {!form.studentId ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                    Chọn học sinh để tải danh sách khoản phí đã gán và phần còn lại.
                  </p>
                ) : feeLinesLoading ? (
                  <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                    Đang tải khoản phí…
                  </p>
                ) : outstandingFeeLines.length === 0 ? (
                  <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-4 text-xs text-amber-950">
                    Không có khoản nợ theo dữ liệu gán phí (hoặc đã thu đủ qua các giao dịch đã gắn khoản). Kiểm tra mục gán phí học sinh hoặc lịch sử thanh toán.
                  </p>
                ) : (
                  <ul className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {outstandingFeeLines.map((row) => {
                      const checked = selectedFeeAssignmentIds.includes(row.id);
                      return (
                        <li key={row.id}>
                          <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-white hover:shadow-sm has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFeeSelection(row.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-on-background">{row.feeStructureName}</span>
                              <span className="text-[11px] text-slate-500">
                                {row.schoolYearName} · Tháng {row.month} · Đã nộp {formatVnd(row.paidAmount)} /{' '}
                                {formatVnd(row.resolvedAmount)}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-black text-emerald-900">{formatVnd(row.remainingAmount)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">Tổng thanh toán lần này</p>
                <p className="mt-1 text-xl font-black text-emerald-950">{formatVnd(selectedTotalVnd)}</p>
                <p className="mt-1 text-[11px] text-emerald-900/90">
                  Bằng tổng phần còn lại của các dòng đã tick (mỗi dòng tạo một bản ghi trong lịch sử).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Phương thức</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {ADMIN_RECORD_METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Số phiếu / biên lai (tuỳ chọn)</label>
                <input
                  value={form.receiptNumber}
                  onChange={(e) => setForm((f) => ({ ...f, receiptNumber: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  maxLength={128}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi chú (tuỳ chọn)</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setCreateOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitCreate()}
                className="flex-1 rounded-xl bg-primary py-3 font-bold text-white hover:bg-tertiary disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
              </div>
        </ModalPortal>
      ) : null}

      {detailRow ? (
        <ModalPortal
          open={!!detailRow}
          onClose={() => setDetailRow(null)}
          backdropClassName="bg-black/50 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-detail-title"
                className="w-full rounded-2xl bg-white p-6 shadow-xl"
              >
            <h2 id="payment-detail-title" className="text-lg font-bold text-primary">
              Chi tiết thanh toán
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Học sinh</dt>
                <dd className="font-semibold text-on-background">{detailRow.studentFullName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Số tiền</dt>
                <dd className="text-lg font-black text-emerald-800">{formatVnd(detailRow.amount)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Thời điểm</dt>
                <dd>{formatPaidAt(detailRow.paidAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Phương thức</dt>
                <dd>{methodLabel(detailRow.method)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Phiếu / biên lai</dt>
                <dd>{detailRow.receiptNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Ghi chú</dt>
                <dd className="whitespace-pre-wrap text-slate-700">{detailRow.note?.trim() ? detailRow.note : '—'}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setDetailRow(null)}
              className="mt-6 w-full rounded-xl bg-slate-100 py-3 font-semibold text-slate-800 hover:bg-slate-200"
            >
              Đóng
            </button>
              </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
