import { useCallback, useEffect, useState } from 'react';
import { getAnnouncementsPaged, type AnnouncementRow } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MaterialSymbol } from '../../components/MaterialSymbol';

const PAGE_SIZE = 10;

function scopeLabel(scope: number): string {
  switch (scope) {
    case 0:
      return 'Toàn trường';
    case 1:
      return 'Theo lớp';
    default:
      return `Phạm vi ${scope}`;
  }
}

function formatDt(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ParentAnnouncementsPage() {
  const { accessToken } = useAuth();
  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncementsPaged(accessToken, {
        q: qDebounced || undefined,
        status: 1,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông báo.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, qDebounced, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="font-h1 text-h1 text-primary">Thông báo</h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Thông báo đã đăng: toàn trường hoặc lớp mà con bạn đang học.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <MaterialSymbol name="search" className="text-[20px]" />
            </span>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc nội dung…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none ring-primary focus:border-transparent focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <MaterialSymbol name="refresh" className="text-[18px]" />
            Làm mới
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          {loading ? 'Đang tải…' : `Trang ${page}/${totalPages} · ${total} thông báo`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {!loading && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
            Không có thông báo phù hợp.
          </div>
        ) : null}
        {items.map((a) => {
          const open = expandedId === a.id;
          return (
            <article
              key={a.id}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex gap-4 p-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <MaterialSymbol name="campaign" className="text-[28px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{a.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {scopeLabel(a.scope)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Đăng: {formatDt(a.publishedAt ?? a.createdAt)}</p>
                  <div
                    className={`mt-3 text-sm leading-relaxed text-slate-700 ${open ? '' : 'line-clamp-3'}`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {a.body}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : a.id)}
                    className="mt-3 text-sm font-bold text-primary hover:underline"
                  >
                    {open ? 'Thu gọn' : 'Xem đầy đủ'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
