import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDailyMenu,
  deleteDailyMenu,
  getClassesForYear,
  getDailyMenuById,
  getDailyMenusPaged,
  getDishesPaged,
  getSchoolYearsCurrent,
  publishDailyMenu,
  revertDailyMenuToDraft,
  updateDailyMenu,
  type ClassRow,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';
import {
  MEAL_TYPES,
  mealTypeLabel,
  menuStatusLabel,
  type DailyMenuItem,
  type DailyMenuSummary,
  type DishRow,
  type UpsertDailyMenuBody,
} from '../types/menu';

function canApproveMenu(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

const menuStatusBadge: Record<number, string> = {
  0: 'bg-amber-100 text-amber-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
};

const PAGE_SIZE = 15;

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

type BuilderState = {
  editId: string | null;
  menuDate: string;
  mealType: number;
  scope: 'school' | 'class';
  classId: string;
  description: string;
  items: DailyMenuItem[];
};

const emptyBuilder: BuilderState = {
  editId: null,
  menuDate: todayStr(),
  mealType: 0,
  scope: 'school',
  classId: '',
  description: '',
  items: [],
};

export function MenuPage() {
  const { accessToken, roles } = useAuth();
  const canApprove = canApproveMenu(roles);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  // Bộ lọc danh sách
  const [filterDate, setFilterDate] = useState('');
  const [filterMeal, setFilterMeal] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<DailyMenuSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dữ liệu tham chiếu
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [dishQuery, setDishQuery] = useState('');

  // Builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builder, setBuilder] = useState<BuilderState>(emptyBuilder);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  // Tải lớp của năm học hiện tại + danh mục món (1 lần)
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const years = await getSchoolYearsCurrent(accessToken);
        const yearId = years.items[0]?.id;
        if (yearId) {
          const cls = await getClassesForYear(accessToken, yearId);
          if (!cancelled) setClasses(cls.items);
        }
      } catch {
        /* không chặn trang nếu lỗi tải lớp */
      }
      try {
        const ds = await getDishesPaged(accessToken, { activeOnly: true, pageSize: 200 });
        if (!cancelled) setDishes(ds.items);
      } catch {
        /* danh mục món rỗng vẫn cho phép nhập */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const listParams = useMemo(
    () => ({
      date: filterDate || undefined,
      mealType: filterMeal !== '' ? Number(filterMeal) : undefined,
      classId: filterClassId || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filterDate, filterMeal, filterClassId, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filterDate, filterMeal, filterClassId]);

  const refreshList = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getDailyMenusPaged(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thực đơn.');
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
    setBuilder(emptyBuilder);
    setDishQuery('');
    setError(null);
    setBuilderOpen(true);
  };

  const openEdit = async (id: string) => {
    if (!accessToken) return;
    setError(null);
    try {
      const d = await getDailyMenuById(accessToken, id);
      setBuilder({
        editId: d.id,
        menuDate: d.menuDate,
        mealType: d.mealType,
        scope: d.classId ? 'class' : 'school',
        classId: d.classId ?? '',
        description: d.description ?? '',
        items: [...d.items].sort((a, b) => a.displayOrder - b.displayOrder),
      });
      setDishQuery('');
      setBuilderOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được thực đơn.');
    }
  };

  const addDish = (dish: DishRow) => {
    setBuilder((b) => {
      if (b.items.some((i) => i.dishId === dish.id)) return b;
      const item: DailyMenuItem = {
        dishId: dish.id,
        dishName: dish.name,
        ingredients: dish.ingredients ?? null,
        nutritionNote: dish.nutritionNote ?? null,
        caloriesKcal: dish.caloriesKcal ?? null,
        containsAllergen: dish.containsAllergen,
        allergenNote: dish.allergenNote ?? null,
        displayOrder: b.items.length,
      };
      return { ...b, items: [...b.items, item] };
    });
  };

  const removeItem = (index: number) => {
    setBuilder((b) => ({
      ...b,
      items: b.items.filter((_, i) => i !== index).map((it, i) => ({ ...it, displayOrder: i })),
    }));
  };

  const submitBuilder = async () => {
    if (!accessToken) return;
    if (builder.scope === 'class' && !builder.classId) {
      setError('Hãy chọn lớp cho thực đơn theo lớp.');
      return;
    }
    if (builder.items.length === 0) {
      setError('Hãy thêm ít nhất một món vào thực đơn.');
      return;
    }
    const body: UpsertDailyMenuBody = {
      menuDate: builder.menuDate,
      mealType: builder.mealType,
      classId: builder.scope === 'class' ? builder.classId : null,
      description: builder.description.trim() || null,
      items: builder.items.map((it, i) => ({ ...it, displayOrder: i })),
    };
    setSubmitting(true);
    setError(null);
    try {
      if (builder.editId) {
        await updateDailyMenu(accessToken, builder.editId, body);
        setSuccessMessage('Đã cập nhật thực đơn.');
      } else {
        await createDailyMenu(accessToken, body);
        setSuccessMessage('Đã tạo thực đơn.');
        setPage(1);
      }
      setBuilderOpen(false);
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
      await deleteDailyMenu(accessToken, id);
      setSuccessMessage('Đã xóa thực đơn.');
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  const doSetStatus = async (id: string, publish: boolean) => {
    if (!accessToken) return;
    setStatusBusyId(id);
    setError(null);
    try {
      if (publish) await publishDailyMenu(accessToken, id);
      else await revertDailyMenuToDraft(accessToken, id);
      setSuccessMessage(publish ? 'Đã công bố thực đơn.' : 'Đã thu hồi về nháp.');
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật trạng thái thất bại.');
    } finally {
      setStatusBusyId(null);
    }
  };

  const filteredDishes = useMemo(() => {
    const q = dishQuery.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter((d) => d.name.toLowerCase().includes(q));
  }, [dishes, dishQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-h1 text-h1 text-primary">Thực đơn</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Lập thực đơn từng ngày theo bữa, chọn món từ danh mục. Phụ huynh sẽ xem được bữa ăn của bé.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm hover:bg-tertiary"
        >
          <MaterialSymbol name="add" />
          Tạo thực đơn
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Ngày</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Bữa</label>
          <select
            value={filterMeal}
            onChange={(e) => setFilterMeal(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            {MEAL_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Lớp</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {filterDate || filterMeal || filterClassId ? (
          <button
            type="button"
            onClick={() => {
              setFilterDate('');
              setFilterMeal('');
              setFilterClassId('');
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Xóa lọc
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Danh sách thực đơn
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có thực đơn nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{formatDate(m.menuDate)}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {mealTypeLabel(m.mealType)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {m.className ?? classNameById.get(m.classId ?? '') ?? 'Toàn trường'}
                    </span>
                    <span className="text-xs text-slate-400">{m.dishCount} món</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${menuStatusBadge[m.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {menuStatusLabel(m.status)}
                    </span>
                  </div>
                  {m.description ? <p className="mt-1 text-xs text-slate-500">{m.description}</p> : null}
                  <p className="mt-1 text-[11px] text-slate-400">Người lập: {m.createdByName || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canApprove && m.status !== 2 ? (
                    <button
                      type="button"
                      disabled={statusBusyId === m.id}
                      onClick={() => void doSetStatus(m.id, true)}
                      className="rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      Công bố
                    </button>
                  ) : null}
                  {canApprove && m.status === 2 ? (
                    <button
                      type="button"
                      disabled={statusBusyId === m.id}
                      onClick={() => void doSetStatus(m.id, false)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Thu hồi
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void openEdit(m.id)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === m.id}
                    onClick={() => {
                      if (window.confirm('Xóa thực đơn này?')) void doDelete(m.id);
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deletingId === m.id ? '…' : 'Xóa'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && totalCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">{totalCount.toLocaleString('vi-VN')} thực đơn</p>
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

      {builderOpen ? (
        <ModalPortal
          open={builderOpen}
          onClose={() => {
            if (!submitting) setBuilderOpen(false);
          }}
          lockBackdrop={submitting}
          panelWrapperClassName="my-auto w-full max-w-2xl shrink-0"
        >
          <div className="max-h-[min(92vh,calc(100vh-4rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <h3 className="font-h3 text-h3">{builder.editId ? 'Sửa thực đơn' : 'Tạo thực đơn'}</h3>
              <button type="button" onClick={() => !submitting && setBuilderOpen(false)} disabled={submitting}>
                <MaterialSymbol name="close" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ngày *</label>
                  <input
                    type="date"
                    value={builder.menuDate}
                    onChange={(e) => setBuilder((b) => ({ ...b, menuDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Bữa *</label>
                  <select
                    value={builder.mealType}
                    onChange={(e) => setBuilder((b) => ({ ...b, mealType: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {MEAL_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Phạm vi *</label>
                  <select
                    value={builder.scope}
                    onChange={(e) =>
                      setBuilder((b) => ({ ...b, scope: e.target.value as 'school' | 'class' }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="school">Toàn trường</option>
                    <option value="class">Theo lớp</option>
                  </select>
                </div>
                {builder.scope === 'class' ? (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Lớp *</label>
                    <select
                      value={builder.classId}
                      onChange={(e) => setBuilder((b) => ({ ...b, classId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">— Chọn lớp —</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Mô tả</label>
                <input
                  value={builder.description}
                  onChange={(e) => setBuilder((b) => ({ ...b, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="VD: Thực đơn đầy đủ 4 nhóm chất."
                />
              </div>

              {/* Món đã chọn */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                  Món trong thực đơn ({builder.items.length})
                </p>
                {builder.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                    Chưa có món. Chọn từ danh mục bên dưới.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {builder.items.map((it, idx) => (
                      <li
                        key={`${it.dishId ?? 'free'}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                          {idx + 1}. {it.dishName}
                          {it.caloriesKcal != null ? (
                            <span className="ml-2 text-xs text-slate-500">{it.caloriesKcal} kcal</span>
                          ) : null}
                          {it.containsAllergen ? (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              Dị ứng
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="flex-shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        >
                          Bỏ
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Danh mục món để chọn */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Chọn món từ danh mục</p>
                <input
                  value={dishQuery}
                  onChange={(e) => setDishQuery(e.target.value)}
                  placeholder="Tìm món…"
                  className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
                  {filteredDishes.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">
                      Không có món phù hợp. Hãy khai báo ở mục “Loại thức ăn”.
                    </p>
                  ) : (
                    filteredDishes.map((d) => {
                      const added = builder.items.some((i) => i.dishId === d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          disabled={added}
                          onClick={() => addDish(d)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
                        >
                          <span className="min-w-0 truncate">
                            {d.name}
                            {d.caloriesKcal != null ? (
                              <span className="ml-2 text-xs text-slate-500">{d.caloriesKcal} kcal</span>
                            ) : null}
                          </span>
                          <span className="flex-shrink-0 text-xs font-bold text-primary">
                            {added ? 'Đã thêm' : '+ Thêm'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => !submitting && setBuilderOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitBuilder}
                disabled={submitting}
                className="ml-auto rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-tertiary disabled:opacity-50"
              >
                {submitting ? 'Đang lưu…' : 'Lưu thực đơn'}
              </button>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
