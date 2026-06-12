import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getMyChildren,
  getParentSchoolYears,
  getPaymentsPaged,
  getPaymentsSummary,
  getStudentFeeAssignmentsPaged,
  postZaloPayCreateOrder,
  postZaloPaySyncFromQuery,
  type ChildRow,
  type ParentSchoolYearBrief,
  type PaymentRow,
  type StudentFeeAssignmentRow,
} from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MaterialSymbol } from '../../components/MaterialSymbol';
import { ModalPortal } from '../../components/ModalPortal';

const PAGE_PAY = 10;
const PAGE_ASSIGN = 10;
const ZALO_LAST_APP_TRANS_KEY = 'zalopayLastAppTransId';
const ZALO_LAST_PENDING_ORDER_KEY = 'zalopayLastPendingOrder';

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

function monthLabel(m: number): string {
  return `Tháng ${m}`;
}

export function ParentPaymentsPage() {
  const { accessToken } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [years, setYears] = useState<ParentSchoolYearBrief[]>([]);

  const [filterStudentId, setFilterStudentId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');
  const [assignMonth, setAssignMonth] = useState<string>('');

  const [payFrom, setPayFrom] = useState('');
  const [payTo, setPayTo] = useState('');
  const [payPage, setPayPage] = useState(1);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [payTotal, setPayTotal] = useState(0);
  const [paySummary, setPaySummary] = useState<number | null>(null);

  const [assignPage, setAssignPage] = useState(1);
  const [assignments, setAssignments] = useState<StudentFeeAssignmentRow[]>([]);
  const [assignTotal, setAssignTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [detailPay, setDetailPay] = useState<PaymentRow | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const zalopayReturnHandled = useRef(false);

  const [zStudentId, setZStudentId] = useState('');
  const [zAmount, setZAmount] = useState('');
  const [zDesc, setZDesc] = useState('');
  const [zSubmitting, setZSubmitting] = useState(false);
  const [zPayingAssignmentId, setZPayingAssignmentId] = useState<string | null>(null);
  const [zLastQr, setZLastQr] = useState<string | null>(null);
  const [zLastUrl, setZLastUrl] = useState<string | null>(null);
  const [zaloSyncing, setZaloSyncing] = useState(false);
  const [zaloSyncingMessage, setZaloSyncingMessage] = useState<string | null>(null);
  const [zSyncingAssignmentId, setZSyncingAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const yearNameById = useMemo(() => Object.fromEntries(years.map((y) => [y.id, y.name])), [years]);

  const loadCatalog = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [ch, yr] = await Promise.all([getMyChildren(accessToken), getParentSchoolYears(accessToken)]);
      setChildren(ch);
      setYears(yr);
      setSchoolYearId((prev) => {
        if (prev && yr.some((y) => y.id === prev)) return prev;
        const cur = yr.find((y) => y.isCurrent);
        return cur?.id ?? yr[0]?.id ?? '';
      });
      setFilterStudentId((prev) => (prev && ch.some((c) => c.id === prev) ? prev : ''));
      setZStudentId((prev) => (prev && ch.some((c) => c.id === prev) ? prev : ch[0]?.id ?? ''));
    } catch {
      setChildren([]);
      setYears([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const payParams = useMemo(
    () => ({
      studentId: filterStudentId || undefined,
      from: payFrom ? localDayStartIso(payFrom) : undefined,
      to: payTo ? localDayEndIso(payTo) : undefined,
      page: payPage,
      pageSize: PAGE_PAY,
    }),
    [filterStudentId, payFrom, payTo, payPage],
  );

  const summaryParams = useMemo(
    () => ({
      studentId: filterStudentId || undefined,
      from: payFrom ? localDayStartIso(payFrom) : undefined,
      to: payTo ? localDayEndIso(payTo) : undefined,
    }),
    [filterStudentId, payFrom, payTo],
  );

  const assignParams = useMemo(
    () => ({
      studentId: filterStudentId || undefined,
      schoolYearId: schoolYearId || undefined,
      month: assignMonth === '' ? undefined : Number(assignMonth),
      page: assignPage,
      pageSize: PAGE_ASSIGN,
    }),
    [filterStudentId, schoolYearId, assignMonth, assignPage],
  );

  const refreshPayments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [pr, sm] = await Promise.all([
        getPaymentsPaged(accessToken, payParams),
        getPaymentsSummary(accessToken, summaryParams),
      ]);
      setPayments(pr.items);
      setPayTotal(pr.totalCount);
      setPaySummary(sm.totalAmount);
      const ar = await getStudentFeeAssignmentsPaged(accessToken, assignParams);
      setAssignments(ar.items);
      setAssignTotal(ar.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.');
      setPayments([]);
      setPayTotal(0);
      setPaySummary(null);
      setAssignments([]);
      setAssignTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, payParams, summaryParams, assignParams]);

  useEffect(() => {
    void refreshPayments();
  }, [refreshPayments]);

  useEffect(() => {
    if (zalopayReturnHandled.current) return;
    if (searchParams.get('from') !== 'zalopay') return;
    zalopayReturnHandled.current = true;
    setSearchParams({}, { replace: true });

    const run = async () => {
      setZaloSyncing(true);
      setZaloSyncingMessage('Đang xác nhận thanh toán từ ZaloPay...');
      const appId = typeof window !== 'undefined' ? localStorage.getItem(ZALO_LAST_APP_TRANS_KEY) : null;
      const pendingRaw = typeof window !== 'undefined' ? localStorage.getItem(ZALO_LAST_PENDING_ORDER_KEY) : null;
      if (pendingRaw) {
        try {
          const parsed = JSON.parse(pendingRaw) as { studentFeeAssignmentId?: string | null };
          setZSyncingAssignmentId(parsed.studentFeeAssignmentId ?? null);
        } catch {
          setZSyncingAssignmentId(null);
        }
      } else {
        setZSyncingAssignmentId(null);
      }
      if (appId && accessToken) {
        for (let i = 0; i < 12; i++) {
          setZaloSyncingMessage(`Đang xác nhận thanh toán từ ZaloPay... (${i + 1}/12)`);
          try {
            const r = await postZaloPaySyncFromQuery(accessToken, { appTransId: appId });
            if (r.status === 'completed' || r.status === 'already_completed') {
              setZaloSyncingMessage('Đã xác nhận thanh toán thành công. Đang cập nhật số liệu...');
              break;
            }
            if (r.status === 'not_found' || r.status === 'disabled' || r.status === 'invalid') {
              setZaloSyncingMessage('Không thể đối soát tự động. Bạn có thể bấm "Tải lại" sau vài giây.');
              break;
            }
          } catch {
            /* mạng / proxy */
          }
          await new Promise((x) => setTimeout(x, 800));
        }
        localStorage.removeItem(ZALO_LAST_APP_TRANS_KEY);
        localStorage.removeItem(ZALO_LAST_PENDING_ORDER_KEY);
      }
      await refreshPayments();
      setSuccessMessage(
        'Đã quay lại từ ZaloPay. Hệ thống đã đối soát với ZaloPay (query) và tải lại danh sách. Nếu giao dịch vừa xong mà chưa hiện, bấm «Tải lại» sau vài giây.',
      );
      setZaloSyncing(false);
      setZaloSyncingMessage(null);
      setZSyncingAssignmentId(null);
    };
    void run();
  }, [searchParams, setSearchParams, refreshPayments, accessToken]);

  useEffect(() => {
    setPayPage(1);
  }, [filterStudentId, payFrom, payTo]);
  useEffect(() => {
    setAssignPage(1);
  }, [filterStudentId, schoolYearId, assignMonth]);

  const payPages = Math.max(1, Math.ceil(payTotal / PAGE_PAY));
  const assignPages = Math.max(1, Math.ceil(assignTotal / PAGE_ASSIGN));

  const submitZaloPayForAssignment = async (a: StudentFeeAssignmentRow) => {
    if (!accessToken) return;
    if (a.remainingAmount <= 0) return;
    setZPayingAssignmentId(a.id);
    setZSubmitting(true);
    setError(null);
    setZLastQr(null);
    setZLastUrl(null);
    try {
      const r = await postZaloPayCreateOrder(accessToken, {
        studentId: a.studentId,
        amountVnd: 1,
        studentFeeAssignmentId: a.id,
        description: null,
      });
      try {
        localStorage.setItem(ZALO_LAST_APP_TRANS_KEY, r.appTransId);
        localStorage.setItem(
          ZALO_LAST_PENDING_ORDER_KEY,
          JSON.stringify({
            appTransId: r.appTransId,
            studentFeeAssignmentId: a.id,
            createdAt: Date.now(),
          }),
        );
      } catch {
        /* private mode */
      }
      setZLastUrl(r.orderUrl ?? null);
      setZLastQr(r.qrCode ?? null);
      if (r.orderUrl) window.open(r.orderUrl, '_blank', 'noopener,noreferrer');
      setSuccessMessage(
        `Đã tạo đơn ZaloPay ${formatVnd(a.remainingAmount)} — ${a.feeStructureName}, ${monthLabel(a.month)}. Hoàn tất trên ZaloPay để ghi nhận vào lịch sử.`,
      );
      await refreshPayments();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không tạo được đơn ZaloPay.';
      if (msg.includes('Đã có đơn ZaloPay đang chờ')) {
        const appId = typeof window !== 'undefined' ? localStorage.getItem(ZALO_LAST_APP_TRANS_KEY) : null;
        if (appId && accessToken) {
          try {
            const sync = await postZaloPaySyncFromQuery(accessToken, { appTransId: appId });
            await refreshPayments();
            if (sync.status === 'completed' || sync.status === 'already_completed') {
              localStorage.removeItem(ZALO_LAST_APP_TRANS_KEY);
              setSuccessMessage('Đã đối soát đơn ZaloPay trước đó. Danh sách đã được cập nhật, bạn có thể thử thanh toán lại nếu vẫn còn nợ.');
              setError(null);
              return;
            }
          } catch {
            // bỏ qua: sẽ hiển thị lỗi gốc bên dưới
          }
        }
      }
      setError(msg);
    } finally {
      setZSubmitting(false);
      setZPayingAssignmentId(null);
    }
  };

  const submitZaloPay = async () => {
    if (!accessToken) return;
    const n = Number(zAmount.replace(/\D/g, ''));
    if (!zStudentId || !Number.isFinite(n) || n < 1) {
      setError('Chọn con và nhập số tiền hợp lệ.');
      return;
    }
    setZSubmitting(true);
    setZPayingAssignmentId(null);
    setError(null);
    try {
      const r = await postZaloPayCreateOrder(accessToken, {
        studentId: zStudentId,
        amountVnd: n,
        description: zDesc.trim() || null,
      });
      try {
        localStorage.setItem(ZALO_LAST_APP_TRANS_KEY, r.appTransId);
        localStorage.setItem(
          ZALO_LAST_PENDING_ORDER_KEY,
          JSON.stringify({
            appTransId: r.appTransId,
            studentFeeAssignmentId: null,
            createdAt: Date.now(),
          }),
        );
      } catch {
        /* private mode */
      }
      setZLastUrl(r.orderUrl ?? null);
      setZLastQr(r.qrCode ?? null);
      if (r.orderUrl) window.open(r.orderUrl, '_blank', 'noopener,noreferrer');
      setSuccessMessage('Đã tạo đơn thanh toán. Hoàn tất trên ZaloPay (sandbox) để ghi nhận vào lịch sử.');
      await refreshPayments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được đơn ZaloPay.');
      setZLastQr(null);
      setZLastUrl(null);
    } finally {
      setZSubmitting(false);
    }
  };

  const qrSrc =
    zLastQr && (zLastQr.startsWith('http://') || zLastQr.startsWith('https://'))
      ? zLastQr
      : zLastQr
        ? `data:image/png;base64,${zLastQr}`
        : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="font-h1 text-h1 text-primary">Học phí & thanh toán</h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Mỗi dòng trong bảng &quot;Khoản phí được gán&quot; là số tiền nhà trường áp dụng — bấm &quot;Thanh toán ZaloPay&quot; để thanh đúng số còn nợ (không cần tự nhập). Sau khi ZaloPay xác nhận, lịch sử và cột &quot;Còn nợ&quot; sẽ cập nhật.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
      ) : null}
      {zaloSyncing ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <MaterialSymbol name="autorenew" className="animate-spin text-[18px]" />
          <span>{zaloSyncingMessage ?? 'Đang xác nhận thanh toán từ ZaloPay...'}</span>
        </div>
      ) : null}

      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Đã nộp (theo bộ lọc dưới)</p>
        <p className="mt-1 text-2xl font-black text-emerald-900">
          {loading ? '…' : paySummary != null ? formatVnd(paySummary) : '—'}
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Con
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
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
          Năm học (khoản phí)
          <select
            value={schoolYearId}
            onChange={(e) => setSchoolYearId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal shadow-sm"
          >
            <option value="">Tất cả</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent ? ' (hiện tại)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Tháng (khoản phí)
          <select
            value={assignMonth}
            onChange={(e) => setAssignMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal shadow-sm"
          >
            <option value="">Tất cả</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                Tháng {i + 1}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void refreshPayments()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-primary-container"
          >
            <MaterialSymbol name="refresh" className="text-[20px]" />
            Tải lại
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3">
          <h2 className="font-h3 text-primary">Khoản phí được gán</h2>
          <p className="text-xs text-slate-500">Thanh toán ZaloPay theo từng khoản — số tiền lấy từ hệ thống (phần còn nợ)</p>
        </div>
        {children.length === 0 && !loading ? (
          <p className="px-4 py-10 text-center text-slate-500">Chưa liên kết học sinh — không có dữ liệu học phí.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                    <th className="px-4 py-3">Con</th>
                    <th className="px-4 py-3">Khoản</th>
                    <th className="px-4 py-3">Tháng</th>
                    <th className="px-4 py-3">Năm học</th>
                    <th className="px-4 py-3 text-right">Phải thu</th>
                    <th className="px-4 py-3 text-right">Đã nộp</th>
                    <th className="px-4 py-3 text-right">Còn nợ</th>
                    <th className="px-4 py-3 text-right">ZaloPay</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && assignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        Chưa có khoản phí phù hợp.
                      </td>
                    </tr>
                  ) : null}
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 odd:bg-white even:bg-slate-50/40">
                      <td className="px-4 py-3 font-medium text-slate-800">{a.studentFullName}</td>
                      <td className="px-4 py-3 text-slate-700">{a.feeStructureName}</td>
                      <td className="px-4 py-3">{monthLabel(a.month)}</td>
                      <td className="px-4 py-3 text-slate-600">{yearNameById[a.schoolYearId] ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatVnd(a.resolvedAmount)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatVnd(a.paidAmount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatVnd(a.remainingAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={zSubmitting || a.remainingAmount <= 0 || (zaloSyncing && zSyncingAssignmentId === a.id)}
                          onClick={() => void submitZaloPayForAssignment(a)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#0068FF] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MaterialSymbol name="payments" className="text-[18px]" />
                          {zPayingAssignmentId === a.id && zSubmitting
                            ? 'Đang tạo…'
                            : zaloSyncing && zSyncingAssignmentId === a.id
                              ? 'Đang đối soát…'
                              : 'Thanh toán'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {assignTotal > PAGE_ASSIGN ? (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
                <span>
                  Trang {assignPage}/{assignPages} · {assignTotal} khoản
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={assignPage <= 1}
                    onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={assignPage >= assignPages}
                    onClick={() => setAssignPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:ring-1 open:ring-slate-100">
        <summary className="cursor-pointer list-none font-semibold text-slate-800 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 text-sm">
            <MaterialSymbol name="tune" className="text-[20px] text-slate-500" />
            Nâng cao: ZaloPay với số tiền tùy chọn (không gắn khoản phí)
          </span>
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          Chỉ dùng khi cần thử sandbox hoặc khoản ngoài danh sách gán phí. Khuyến nghị: luôn dùng nút &quot;Thanh toán&quot; trên từng dòng ở bảng trên.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Con
            <select
              value={zStudentId}
              onChange={(e) => setZStudentId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Số tiền (VNĐ)
            <input
              value={zAmount}
              onChange={(e) => setZAmount(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2"
              inputMode="numeric"
              placeholder="Ví dụ: 50000"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Ghi chú (tuỳ chọn)
            <input
              value={zDesc}
              onChange={(e) => setZDesc(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Ví dụ: Thử nghiệm sandbox"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={zSubmitting || children.length === 0}
          onClick={() => void submitZaloPay()}
          className="mt-4 w-full rounded-xl bg-slate-800 py-3 font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50 md:max-w-md"
        >
          {zSubmitting && !zPayingAssignmentId ? 'Đang tạo đơn…' : 'Tạo đơn & mở ZaloPay'}
        </button>
        {zLastUrl ? (
          <p className="mt-2 text-xs text-slate-500">
            Nếu cửa sổ bị chặn,{' '}
            <a href={zLastUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
              mở link thanh toán
            </a>
          </p>
        ) : null}
        {qrSrc ? (
          <div className="mt-4 flex flex-col items-center">
            <p className="mb-2 text-xs font-semibold text-slate-600">Mã QR</p>
            <img src={qrSrc} alt="QR ZaloPay" className="h-48 w-48 rounded-lg border border-slate-200 bg-white object-contain p-2" />
          </div>
        ) : null}
      </details>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-h3 text-primary">Lịch sử đã nộp</h2>
            <p className="text-xs text-slate-500">
              Giao dịch đã ghi nhận (quầy hoặc ZaloPay). Xóa hai ô ngày để xem mọi thời điểm — nếu đã chọn khoảng ngày, chỉ hiện giao dịch trong khoảng đó.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={payFrom}
              onChange={(e) => setPayFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            />
            <span className="self-center text-slate-400">→</span>
            <input
              type="date"
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {!loading && payments.length === 0 ? (
            <li className="px-4 py-10 text-center text-slate-500">Chưa có giao dịch trong bộ lọc.</li>
          ) : null}
          {payments.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setDetailPay(p)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50/80"
              >
                <div>
                  <p className="font-bold text-slate-900">{p.studentFullName}</p>
                  <p className="text-xs text-slate-500">
                    {formatPaidAt(p.paidAt)} · {methodLabel(p.method)}
                  </p>
                </div>
                <span className="font-bold text-emerald-800">{formatVnd(p.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
        {payTotal > PAGE_PAY ? (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <span>
              Trang {payPage}/{payPages} · {payTotal} giao dịch
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={payPage <= 1}
                onClick={() => setPayPage((x) => Math.max(1, x - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={payPage >= payPages}
                onClick={() => setPayPage((x) => x + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {detailPay ? (
        <ModalPortal
          open={!!detailPay}
          onClose={() => setDetailPay(null)}
          backdropClassName="bg-black/50 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
              <div role="dialog" aria-modal="true" className="w-full rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold text-primary">Chi tiết giao dịch</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Học sinh</dt>
                    <dd className="font-semibold">{detailPay.studentFullName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Số tiền</dt>
                    <dd className="text-lg font-black text-emerald-800">{formatVnd(detailPay.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Thời điểm</dt>
                    <dd>{formatPaidAt(detailPay.paidAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Phương thức</dt>
                    <dd>{methodLabel(detailPay.method)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Phiếu</dt>
                    <dd>{detailPay.receiptNumber ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Ghi chú</dt>
                    <dd className="whitespace-pre-wrap">{detailPay.note?.trim() ? detailPay.note : '—'}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setDetailPay(null)}
                  className="mt-6 w-full rounded-xl bg-slate-100 py-3 font-semibold text-slate-800"
                >
                  Đóng
                </button>
              </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
