import { useCallback, useEffect, useState } from 'react';
import { getDailyMenuById, getDailyMenusPaged, getTodayMenus } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MaterialSymbol } from '../../components/MaterialSymbol';
import {
  mealTypeLabel,
  type DailyMenuDetail,
  type DailyMenuItem,
  type DailyMenuSummary,
} from '../../types/menu';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

function ItemRow({ item }: { item: DailyMenuItem }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
        <MaterialSymbol name="lunch_dining" className="text-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800">{item.dishName}</span>
          {item.caloriesKcal != null ? (
            <span className="text-xs text-slate-500">{item.caloriesKcal} kcal</span>
          ) : null}
          {item.containsAllergen ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Dị ứng{item.allergenNote ? `: ${item.allergenNote}` : ''}
            </span>
          ) : null}
        </div>
        {item.ingredients ? <p className="text-xs text-slate-500">{item.ingredients}</p> : null}
        {item.nutritionNote ? <p className="text-xs text-emerald-700">{item.nutritionNote}</p> : null}
      </div>
    </li>
  );
}

function MenuCard({ menu }: { menu: DailyMenuDetail }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <h3 className="text-base font-bold text-primary">{mealTypeLabel(menu.mealType)}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {menu.className ?? 'Toàn trường'}
        </span>
      </div>
      <div className="px-5 py-3">
        {menu.description ? <p className="mb-2 text-sm text-slate-600">{menu.description}</p> : null}
        {menu.items.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">Chưa có món.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...menu.items]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((it, i) => (
                <ItemRow key={`${it.dishId ?? 'free'}-${i}`} item={it} />
              ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function ParentMenuPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<'today' | 'history'>('today');

  // Hôm nay
  const [todayMenus, setTodayMenus] = useState<DailyMenuDetail[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  // Lịch sử
  const [page, setPage] = useState(1);
  const [historyItems, setHistoryItems] = useState<DailyMenuSummary[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, DailyMenuDetail | 'loading' | undefined>>({});

  const loadToday = useCallback(async () => {
    if (!accessToken) return;
    setTodayLoading(true);
    setTodayError(null);
    try {
      const r = await getTodayMenus(accessToken);
      setTodayMenus([...r].sort((a, b) => a.mealType - b.mealType));
    } catch (e) {
      setTodayError(e instanceof Error ? e.message : 'Không tải được thực đơn hôm nay.');
      setTodayMenus([]);
    } finally {
      setTodayLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const r = await getDailyMenusPaged(accessToken, { page, pageSize: PAGE_SIZE });
      setHistoryItems(r.items);
      setHistoryTotal(r.totalCount);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Không tải được lịch sử bữa ăn.');
      setHistoryItems([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);

  const toggleExpand = async (id: string) => {
    if (expanded[id] && expanded[id] !== 'loading') {
      setExpanded((e) => ({ ...e, [id]: undefined }));
      return;
    }
    if (!accessToken) return;
    setExpanded((e) => ({ ...e, [id]: 'loading' }));
    try {
      const detail = await getDailyMenuById(accessToken, id);
      setExpanded((e) => ({ ...e, [id]: detail }));
    } catch {
      setExpanded((e) => ({ ...e, [id]: undefined }));
    }
  };

  const totalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="font-h1 text-h1 text-primary">Thực đơn của bé</h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Xem bữa ăn hôm nay của con và lịch sử các bữa ăn trước.
        </p>
        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTab('today')}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === 'today' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Lịch sử bữa ăn
          </button>
        </div>
      </div>

      {tab === 'today' ? (
        <div className="space-y-4">
          {todayError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {todayError}
            </div>
          ) : null}
          {todayLoading ? (
            <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center text-slate-500">
              Đang tải…
            </div>
          ) : todayMenus.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              Hôm nay chưa có thực đơn được đăng.
            </div>
          ) : (
            todayMenus.map((m) => <MenuCard key={m.id} menu={m} />)
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {historyError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {historyError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              {historyLoading ? 'Đang tải…' : `Trang ${page}/${totalPages} · ${historyTotal} thực đơn`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || historyLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages || historyLoading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>

          {!historyLoading && historyItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              Chưa có lịch sử bữa ăn.
            </div>
          ) : null}

          <div className="space-y-3">
            {historyItems.map((m) => {
              const detail = expanded[m.id];
              const open = !!detail && detail !== 'loading';
              return (
                <article key={m.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => void toggleExpand(m.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{formatDate(m.menuDate)}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {mealTypeLabel(m.mealType)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {m.className ?? 'Toàn trường'}
                        </span>
                        <span className="text-xs text-slate-400">{m.dishCount} món</span>
                      </div>
                      {m.description ? <p className="mt-1 text-xs text-slate-500">{m.description}</p> : null}
                    </div>
                    <MaterialSymbol name={open ? 'expand_less' : 'expand_more'} className="text-slate-400" />
                  </button>
                  {detail === 'loading' ? (
                    <p className="px-5 pb-4 text-sm text-slate-400">Đang tải món…</p>
                  ) : open ? (
                    <div className="border-t border-slate-100 px-5 py-3">
                      <ul className="divide-y divide-slate-100">
                        {[...detail.items]
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((it, i) => (
                            <ItemRow key={`${it.dishId ?? 'free'}-${i}`} item={it} />
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
