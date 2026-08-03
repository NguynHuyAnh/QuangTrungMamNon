import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createFeeStructure,
  deleteFeeStructure,
  getFeeStructuresPaged,
  getFeeCategories,
  getSchoolYearsPaged,
  updateFeeStructure,
  type FeeCategoryRow,
  type FeeStructureRow,
  type SchoolYearRow,
  type UpsertFeeStructureBody,
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

function feeLabel(row: FeeStructureRow): string {
  if (row.feeCategoryName) return row.feeCategoryName;
  if (row.feeType === 0) return 'Học phí';
  if (row.feeType === 1) return 'Tiền ăn';
  if (row.feeType === 2) return 'Khác';
  return `Loại ${row.feeType}`;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

export function FeeStructuresPage() {
  const { accessToken, roles } = useAuth();
  const readPerm = canReadFees(roles);
  const writePerm = canWriteFees(roles);

  const [years, setYears] = useState<SchoolYearRow[]>([]);
  const [feeCategories, setFeeCategories] = useState<FeeCategoryRow[]>([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FeeStructureRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ schoolYearId: '', name: '', amount: '', feeCategoryId: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, schoolYearId]);

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

  const loadCategories = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    try {
      const cats = await getFeeCategories(accessToken);
      setFeeCategories(cats);
    } catch {
      setFeeCategories([]);
    }
  }, [accessToken, readPerm]);

  useEffect(() => {
    void loadYears();
    void loadCategories();
  }, [loadYears, loadCategories]);

  const yearNameById = useMemo(() => Object.fromEntries(years.map((y) => [y.id, y.name])), [years]);

  const listParams = useMemo(
    () => ({
      schoolYearId: schoolYearId || undefined,
      q: qDebounced || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [schoolYearId, qDebounced, page],
  );

  const refreshList = useCallback(async () => {
    if (!accessToken || !readPerm) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getFeeStructuresPaged(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được biểu phí.');
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
    setForm({
      schoolYearId: schoolYearId || years[0]?.id || '',
      name: '',
      amount: '',
      feeCategoryId: feeCategories[0]?.id || '',
    });
    setModalOpen(true);
  };

  const openEdit = (row: FeeStructureRow) => {
    setError(null);
    setEditId(row.id);
    setForm({
      schoolYearId: row.schoolYearId,
      name: row.name,
      amount: String(row.amount),
      feeCategoryId: row.feeCategoryId ?? feeCategories[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const parseAmount = (): number | null => {
    const raw = form.amount.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const submitForm = async () => {
    if (!accessToken || !writePerm) return;
    const amount = parseAmount();
    if (!form.name.trim()) {
      setError('Nhập tên khoản thu.');
      return;
    }
    if (amount === null) {
      setError('Số tiền không hợp lệ.');
      return;
    }
    if (!form.schoolYearId) {
      setError('Chọn năm học.');
      return;
    }
    const body: UpsertFeeStructureBody = {
      schoolYearId: form.schoolYearId,
      name: form.name.trim(),
      amount,
      feeType: 0,
      feeCategoryId: form.feeCategoryId || null,
    };
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await updateFeeStructure(accessToken, editId, body);
        setSuccessMessage('Đã cập nhật khoản thu.');
      } else {
        await createFeeStructure(accessToken, body);
        setSuccessMessage('Đã thêm khoản thu.');
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
    if (!window.confirm('Xóa mềm khoản thu này? (Có thể ảnh hưởng gán phí nếu đang dùng.)')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteFeeStructure(accessToken, id);
      setSuccessMessage('Đã xóa khoản thu.');
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
          <h1 className="font-h1 text-primary">Biểu phí</h1>
          <p className="mt-1 text-on-surface-variant">Khoản thu theo năm học — dùng cho gán phí học sinh.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-amber-900">
          <MaterialSymbol name="lock" className="mx-auto mb-3 text-4xl opacity-70" />
          <p className="font-semibold">Tài khoản không có quyền xem biểu phí</p>
          <p className="mt-2 text-sm text-amber-800/90">
            Chỉ <strong>Kế toán</strong>, <strong>Ban giám hiệu</strong> hoặc <strong>SuperAdmin</strong> được truy cập (theo chính sách API).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-h1 text-primary">Biểu phí</h1>
          <p className="mt-1 text-on-surface-variant">
            Định mức theo năm học — học phí, tiền ăn, khoản khác
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
            Thêm khoản thu
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
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
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Tìm theo tên</label>
          <div className="relative">
            <MaterialSymbol
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Ví dụ: học phí..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        {!writePerm ? (
          <p className="text-xs text-slate-500 sm:max-w-xs">
            Bạn đang xem với quyền <strong>Ban giám hiệu</strong>: chỉnh sửa do Kế toán / SuperAdmin thực hiện.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Danh sách khoản thu
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có khoản thu cho bộ lọc này.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary">
                    <MaterialSymbol name="request_quote" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-on-background">{row.name}</p>
                    <p className="text-xs text-slate-500">
                      {feeLabel(row)} · {yearNameById[row.schoolYearId] ?? 'Năm học'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-800">
                    {formatVnd(row.amount)}
                  </span>
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
            <h2 className="text-lg font-bold text-primary">{editId ? 'Sửa khoản thu' : 'Thêm khoản thu'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Năm học</label>
                <select
                  value={form.schoolYearId}
                  onChange={(e) => setForm((f) => ({ ...f, schoolYearId: e.target.value }))}
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
                <label className="mb-1 block text-xs font-semibold text-slate-600">Tên khoản</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ví dụ: Học phí tháng 9"
                  maxLength={128}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Số tiền (VNĐ)</label>
                <input
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="1500000"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Loại phí</label>
                <select
                  value={form.feeCategoryId}
                  onChange={(e) => setForm((f) => ({ ...f, feeCategoryId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {feeCategories.length === 0 ? (
                    <option value="">Chưa có loại phí — vào &quot;Loại phí&quot; để thêm</option>
                  ) : (
                    feeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  )}
                </select>
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
