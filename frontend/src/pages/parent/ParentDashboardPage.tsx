import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyChildren, postParentLinkStudent } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MaterialSymbol } from '../../components/MaterialSymbol';

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0]!.slice(0, 1).toUpperCase();
  return (p[0]!.slice(0, 1) + p[p.length - 1]!.slice(0, 1)).toUpperCase();
}

function formatDob(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function statusLabel(status: number): string {
  switch (status) {
    case 0:
      return 'Đang học';
    case 1:
      return 'Tạm nghỉ';
    case 2:
      return 'Đã nghỉ';
    default:
      return `Trạng thái ${status}`;
  }
}

export function ParentDashboardPage() {
  const { accessToken, email } = useAuth();
  const [children, setChildren] = useState<{ id: string; fullName: string; dateOfBirth: string; status: number }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkHint, setLinkHint] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await getMyChildren(accessToken);
        if (!cancelled) {
          setChildren(rows);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được danh sách con.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function onLinkChild(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !linkCode.trim()) return;
    setLinkBusy(true);
    setLinkHint(null);
    try {
      const res = await postParentLinkStudent(accessToken, { code: linkCode.trim() });
      const rows = await getMyChildren(accessToken);
      setChildren(rows);
      if (res.alreadyLinked) {
        setLinkHint('Học sinh này đã được liên kết với tài khoản của bạn.');
      } else {
        setLinkHint('Đã liên kết. Danh sách con đã được cập nhật.');
      }
      setLinkCode('');
    } catch (err) {
      setLinkHint(err instanceof Error ? err.message : 'Không liên kết được.');
    } finally {
      setLinkBusy(false);
    }
  }

  const greetName = email?.split('@')[0] ?? 'bạn';

  return (
    <>
      <section className="flex flex-col justify-between gap-md md:flex-row md:items-center">
        <div className="space-y-xs">
          <h1 className="font-h1 text-h1 text-primary">Xin chào, {greetName}!</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {loading ? (
              'Đang tải…'
            ) : error ? (
              <span className="text-error">{error}</span>
            ) : (
              'Theo dõi điểm danh, thông báo và học phí của các con đã liên kết.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-md">
          <Link
            to="/parent/announcements"
            className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-lg py-md font-label-md text-slate-800 shadow-sm transition-colors hover:bg-surface-container-low"
          >
            <MaterialSymbol name="campaign" className="text-primary" />
            Thông báo
          </Link>
          <Link
            to="/parent/payments"
            className="flex items-center gap-2 rounded-xl bg-secondary px-lg py-md font-label-md text-on-primary shadow-lg transition-transform hover:bg-on-secondary-fixed-variant active:scale-95"
          >
            <MaterialSymbol name="account_balance_wallet" />
            Học phí & thanh toán
          </Link>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/parent/attendance"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
            <MaterialSymbol name="event_note" className="text-[28px]" />
          </span>
          <div>
            <p className="font-bold text-slate-900">Điểm danh</p>
            <p className="text-xs text-slate-500">Lịch sử có mặt / vắng</p>
          </div>
        </Link>
        <Link
          to="/parent/announcements"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
            <MaterialSymbol name="campaign" className="text-[28px]" />
          </span>
          <div>
            <p className="font-bold text-slate-900">Thông báo</p>
            <p className="text-xs text-slate-500">Toàn trường & lớp con</p>
          </div>
        </Link>
        <Link
          to="/parent/payments"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
            <MaterialSymbol name="payments" className="text-[28px]" />
          </span>
          <div>
            <p className="font-bold text-slate-900">Học phí</p>
            <p className="text-xs text-slate-500">Khoản phí & đã nộp</p>
          </div>
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-12 gap-gutter">
        <div className="col-span-12 space-y-lg lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 font-h2 text-h2 text-primary">
              <MaterialSymbol name="family_history" className="text-secondary" />
              Các con của bạn
            </h2>
          </div>
          {!loading && !error && children.length === 0 ? (
            <div className="rounded-xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-6 shadow-sm">
              <p className="text-center text-sm font-medium text-slate-700">
                Chưa có học sinh liên kết với tài khoản này. Bạn có thể nhập <strong>mã</strong> giống trên màn hình Quản lý
                học sinh (mã đăng ký, UUID đầy đủ, hoặc 8 ký tự đầu ID khi trường hợp duy nhất).
              </p>
              <p className="mt-2 text-center text-xs text-slate-500">
                Tài khoản tạo trước đây mà chưa nhập mã lúc đăng ký — dùng ô bên dưới. Tài khoản mới nên điền mã tại{' '}
                <Link to="/register-parent" className="font-semibold text-primary underline">
                  Đăng ký phụ huynh
                </Link>
                .
              </p>
              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(ev) => void onLinkChild(ev)}
              >
                <label className="min-w-0 flex-1 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  Mã liên kết
                  <input
                    value={linkCode}
                    onChange={(ev) => setLinkCode(ev.target.value)}
                    placeholder="VD: QT-2025-001 hoặc 53D584E5…"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 shadow-inner outline-none ring-primary focus:ring-2"
                    autoComplete="off"
                  />
                </label>
                <button
                  type="submit"
                  disabled={linkBusy || !linkCode.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-primary-container disabled:opacity-50"
                >
                  <MaterialSymbol name="link" className="text-[20px]" />
                  {linkBusy ? 'Đang xử lý…' : 'Liên kết ngay'}
                </button>
              </form>
              {linkHint ? (
                <p
                  className={`mt-3 text-center text-sm font-medium ${linkHint.startsWith('Không') || linkHint.startsWith('Lỗi') || linkHint.includes('HTTP') ? 'text-rose-700' : 'text-emerald-800'}`}
                >
                  {linkHint}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            {children.map((c) => (
              <div
                key={c.id}
                className="group overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-md p-lg">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface-container-highest bg-blue-100 text-2xl font-bold text-primary">
                      {initials(c.fullName)}
                    </div>
                    <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-h3 text-h3 text-primary">{c.fullName}</h3>
                    <p className="mb-xs font-label-md text-on-surface-variant">Ngày sinh: {formatDob(c.dateOfBirth)}</p>
                    <div className="mt-sm flex flex-wrap gap-2">
                      <span className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-label-sm font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {statusLabel(c.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-sm border-t border-slate-100 bg-surface-container-low p-md">
                  <Link
                    to="/parent/attendance"
                    className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white py-2.5 font-semibold text-blue-900 transition-colors hover:bg-blue-50"
                  >
                    <MaterialSymbol name="event_note" className="text-[18px]" />
                    Điểm danh
                  </Link>
                  <Link
                    to="/parent/announcements"
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-semibold text-white transition-colors hover:bg-primary-container"
                  >
                    <MaterialSymbol name="campaign" className="text-[18px]" />
                    Thông báo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
