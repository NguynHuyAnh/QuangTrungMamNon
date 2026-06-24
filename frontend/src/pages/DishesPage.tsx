import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDish,
  deleteDish,
  getDishesPaged,
  updateDish,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';
import type { DishRow, UpsertDishBody } from '../types/menu';

const PAGE_SIZE = 15;

type FormState = {
  name: string;
  ingredients: string;
  nutritionNote: string;
  caloriesKcal: string;
  containsAllergen: boolean;
  allergenNote: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  ingredients: '',
  nutritionNote: '',
  caloriesKcal: '',
  containsAllergen: false,
  allergenNote: '',
  isActive: true,
};

function canWriteDishes(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

export function DishesPage() {
  const { accessToken, roles } = useAuth();
  const canWrite = canWriteDishes(roles);

  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DishRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const listParams = useMemo(
    () => ({ q: qDebounced || undefined, page, pageSize: PAGE_SIZE }),
    [qDebounced, page],
  );

  const refreshList = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getDishesPaged(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh mục món.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, listParams]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (d: DishRow) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      ingredients: d.ingredients ?? '',
      nutritionNote: d.nutritionNote ?? '',
      caloriesKcal: d.caloriesKcal != null ? String(d.caloriesKcal) : '',
      containsAllergen: d.containsAllergen,
      allergenNote: d.allergenNote ?? '',
      isActive: d.isActive,
    });
    setError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!accessToken || !form.name.trim()) {
      setError('Tên món không được để trống.');
      return;
    }
    const calRaw = form.caloriesKcal.trim();
    let calories: number | null = null;
    if (calRaw) {
      const n = Number(calRaw);
      if (!Number.isFinite(n) || n < 0) {
        setError('Calo phải là số không âm.');
        return;
      }
      calories = Math.round(n);
    }
    const body: UpsertDishBody = {
      name: form.name.trim(),
      ingredients: form.ingredients.trim() || null,
      nutritionNote: form.nutritionNote.trim() || null,
      caloriesKcal: calories,
      containsAllergen: form.containsAllergen,
      allergenNote: form.containsAllergen ? form.allergenNote.trim() || null : null,
      isActive: form.isActive,
    };
    setSubmitting(true);
    setError(null);
    try {
      if (editId) {
        await updateDish(accessToken, editId, body);
        setSuccessMessage('Đã cập nhật món.');
      } else {
        await createDish(accessToken, body);
        setSuccessMessage('Đã thêm món mới.');
        setPage(1);
      }
      setModalOpen(false);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async (id: string) => {
    if (!accessToken) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteDish(accessToken, id);
      setSuccessMessage('Đã xóa món.');
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-h1 text-h1 text-primary">Loại thức ăn</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Danh mục món do Ban giám hiệu khai báo. Giáo viên chọn lại các món này khi lập thực đơn.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm hover:bg-tertiary"
          >
            <MaterialSymbol name="add" />
            Thêm món
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <MaterialSymbol
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Tìm theo tên hoặc thành phần…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Danh sách món
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có món nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{d.name}</span>
                    {d.caloriesKcal != null ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {d.caloriesKcal} kcal
                      </span>
                    ) : null}
                    {d.containsAllergen ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Dị ứng{d.allergenNote ? `: ${d.allergenNote}` : ''}
                      </span>
                    ) : null}
                    {!d.isActive ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Ngừng dùng
                      </span>
                    ) : null}
                  </div>
                  {d.ingredients ? <p className="mt-1 text-xs text-slate-500">{d.ingredients}</p> : null}
                </div>
                {canWrite ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === d.id}
                      onClick={() => {
                        if (window.confirm(`Xóa món "${d.name}"?`)) void doDelete(d.id);
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingId === d.id ? '…' : 'Xóa'}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!loading && totalCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">
              {from}–{to} / {totalCount.toLocaleString('vi-VN')}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_left" />
              </button>
              <span className="px-2 text-xs font-semibold">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_right" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <ModalPortal
          open={modalOpen}
          onClose={() => {
            if (!submitting) setModalOpen(false);
          }}
          lockBackdrop={submitting}
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <h3 className="font-h3 text-h3">{editId ? 'Sửa món' : 'Thêm món mới'}</h3>
              <button type="button" onClick={() => !submitting && setModalOpen(false)} disabled={submitting}>
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tên món *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="VD: Cháo thịt bằm rau củ"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Thành phần</label>
                <input
                  value={form.ingredients}
                  onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="VD: Gạo tẻ, thịt heo, cà rốt…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Năng lượng (kcal)</label>
                  <input
                    inputMode="numeric"
                    value={form.caloriesKcal}
                    onChange={(e) => setForm((f) => ({ ...f, caloriesKcal: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="VD: 180"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    Còn sử dụng
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ghi chú dinh dưỡng</label>
                <input
                  value={form.nutritionNote}
                  onChange={(e) => setForm((f) => ({ ...f, nutritionNote: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="VD: Giàu canxi"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.containsAllergen}
                    onChange={(e) => setForm((f) => ({ ...f, containsAllergen: e.target.checked }))}
                  />
                  Có chất gây dị ứng
                </label>
                {form.containsAllergen ? (
                  <input
                    value={form.allergenNote}
                    onChange={(e) => setForm((f) => ({ ...f, allergenNote: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="VD: Chứa sữa (lactose)"
                  />
                ) : null}
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => !submitting && setModalOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="ml-auto rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-tertiary disabled:opacity-50"
              >
                {submitting ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
