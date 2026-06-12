import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAttendanceRecords, getMyChildren, type AttendanceRecordRow, type ChildRow } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MaterialSymbol } from '../../components/MaterialSymbol';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function attendanceStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return 'Có mặt';
    case 1:
      return 'Vắng';
    case 2:
      return 'Muộn';
    case 3:
      return 'Nghỉ có phép';
    default:
      return `Mã ${status}`;
  }
}

function formatDateVi(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function attendanceBadgeClass(status: number): string {
  switch (status) {
    case 0:
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 1:
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 2:
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 3:
      return 'bg-sky-50 text-sky-900 border-sky-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function ParentAttendancePage() {
  const { accessToken } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [from, setFrom] = useState(() => ymd(addDays(new Date(), -30)));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [rows, setRows] = useState<AttendanceRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nameByStudentId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of children) m.set(c.id, c.fullName);
    return m;
  }, [children]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getMyChildren(accessToken);
        if (!cancelled) {
          setChildren(list);
          setStudentId((prev) => (prev && list.some((c) => c.id === prev) ? prev : ''));
        }
      } catch {
        if (!cancelled) setChildren([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const loadRecords = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAttendanceRecords(accessToken, {
        from,
        to,
        pageSize: 500,
        ...(studentId ? { studentId } : {}),
      });
      setRows(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được điểm danh.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, from, to, studentId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-h1 text-h1 text-primary">Điểm danh của con</h1>
          <p className="mt-1 max-w-xl text-body-md text-on-surface-variant">
            Xem lịch sử điểm danh các con đã liên kết với tài khoản của bạn (chỉ đọc).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRecords()}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-primary-container md:self-auto"
        >
          <MaterialSymbol name="refresh" className="text-[20px]" />
          Tải lại
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Con
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal shadow-sm"
          >
            <option value="">Tất cả con</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal shadow-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Đến ngày
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal shadow-sm"
          />
        </label>
        <div className="flex items-end text-sm text-slate-500">
          {loading ? 'Đang tải…' : `${rows.length} bản ghi trong khoảng đã chọn`}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3">
          <h2 className="font-h3 text-primary">Bảng điểm danh</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ghi chú / lý do</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Chưa có dữ liệu điểm danh trong khoảng thời gian này.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 odd:bg-white even:bg-slate-50/40">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{formatDateVi(r.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{nameByStudentId.get(r.studentId) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${attendanceBadgeClass(r.status)}`}
                    >
                      {attendanceStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{r.reason?.trim() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
