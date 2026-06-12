import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deletePayment,
  getClassesPaged,
  getPaymentsPaged,
  getPaymentsSummary,
  getPaymentInvoiceDetail,
  getSchoolYearsCurrent,
  getSchoolYearsRecent,
  getStudentsBillingView,
  updatePayment,
  type ClassRow,
  type PaymentInvoiceDetail,
  type PaymentRow,
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

function internalReceiptRef(detail: Pick<PaymentInvoiceDetail, 'id'>): string {
  return `BL-${detail.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Ghi HTML biên lai vào cửa sổ đã mở (gọi sau khi đã `window.open` đồng bộ trong click). */
function writeInvoiceToWindow(w: Window, detail: PaymentInvoiceDetail) {
  const amount = formatVnd(detail.amount);
  const when = formatPaidAt(detail.paidAt);
  const fee = detail.feeLineDescription ?? 'Thu phí (theo ghi nhận hệ thống)';
  const cls = detail.currentClassName ?? '—';
  const reg = detail.studentRegistrationCode ?? '—';
  const receiptManual = detail.receiptNumber?.trim() ?? '';
  const internalRef = internalReceiptRef(detail);
  const displayReceipt = receiptManual || internalRef;
  const note = detail.note?.trim() ? escapeHtml(detail.note) : '—';
  const title = escapeHtml(detail.schoolTitle);
  const name = escapeHtml(detail.studentFullName);
  const method = escapeHtml(methodLabel(detail.method));
  const fullId = escapeHtml(detail.id);
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><title>Biên lai ${escapeHtml(displayReceipt)}</title>
<style>
  body{font-family:Segoe UI,system-ui,sans-serif;margin:0;padding:24px;color:#111;background:#fff}
  .wrap{max-width:640px;margin:0 auto;border:1px solid #ddd;padding:28px;border-radius:12px}
  h1{font-size:20px;margin:0 0 4px;text-align:center;color:#0B3D91}
  .sub{text-align:center;font-size:12px;color:#555;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{padding:8px 0;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
  th{width:38%;color:#555;font-weight:600}
  .amt{font-size:22px;font-weight:800;color:#047857;text-align:center;margin:16px 0}
  .mono{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all}
  .no-print{margin-top:20px;text-align:center}
  button{background:#0B3D91;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px}
  button:hover{filter:brightness(1.08)}
  @media print{.no-print{display:none!important}.wrap{border:none}}
</style></head><body>
<div class="wrap">
  <h1>${title}</h1>
  <p class="sub">Biên lai thanh toán</p>
  <table>
    <tr><th>Số tham chiếu in</th><td><strong>${escapeHtml(displayReceipt)}</strong>${receiptManual ? '' : ' <span style="color:#666;font-size:12px">(tự sinh — có thể nhập số phiếu thật ở mục Sửa)</span>'}</td></tr>
    <tr><th>Số phiếu / biên lai (nhập tay)</th><td>${receiptManual ? escapeHtml(receiptManual) : '—'}</td></tr>
    <tr><th>Mã giao dịch (hệ thống)</th><td class="mono">${fullId}</td></tr>
    <tr><th>Thời gian thanh toán</th><td>${escapeHtml(when)}</td></tr>
    <tr><th>Phương thức</th><td>${method}</td></tr>
    <tr><th>Học sinh</th><td>${name}</td></tr>
    <tr><th>Mã đăng ký HS</th><td>${escapeHtml(reg)}</td></tr>
    <tr><th>Lớp</th><td>${escapeHtml(cls)}</td></tr>
    <tr><th>Nội dung thu</th><td>${escapeHtml(fee)}</td></tr>
    <tr><th>Ghi chú</th><td>${note}</td></tr>
  </table>
  <p class="amt">${escapeHtml(amount)}</p>
</div>
<div class="no-print"><button type="button" onclick="window.print()">In / Lưu PDF</button></div>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Mở cửa sổ trắng ngay trong sự kiện click (trước await) để trình duyệt không chặn popup. */
function openPrintTab(): Window | null {
  return window.open('about:blank', '_blank', 'width=820,height=900');
}

export function InvoicesPage() {
  const { accessToken, roles } = useAuth();
  const readPerm = canReadPayments(roles);
  const writePerm = canWritePayments(roles);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ id: string; fullName: string }[]>([]);

  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
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

  const [detailRow, setDetailRow] = useState<PaymentRow | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<PaymentInvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ receiptNumber: '', note: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [filterStudentId, filterClassId, fromDate, toDate, qDebounced]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const loadClasses = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    try {
      let sy = await getSchoolYearsCurrent(accessToken);
      if (sy.items.length === 0) sy = await getSchoolYearsRecent(accessToken);
      const y = sy.items[0];
      if (!y) {
        setClasses([]);
        return;
      }
      const cl = await getClassesPaged(accessToken, { schoolYearId: y.id, pageSize: 200 });
      setClasses(cl.items);
    } catch {
      setClasses([]);
    }
  }, [accessToken, readPerm]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const loadStudentOptions = useCallback(async () => {
    if (!accessToken || !readPerm) return;
    try {
      const r = await getStudentsBillingView(accessToken, {
        pageSize: 200,
        page: 1,
      });
      setStudentOptions(r.items.map((s) => ({ id: s.id, fullName: s.fullName })));
    } catch {
      setStudentOptions([]);
    }
  }, [accessToken, readPerm]);

  useEffect(() => {
    void loadStudentOptions();
  }, [loadStudentOptions]);

  const filterApiParams = useMemo(() => {
    return {
      studentId: filterStudentId || undefined,
      classId: filterClassId || undefined,
      q: qDebounced || undefined,
      from: fromDate ? localDayStartIso(fromDate) : undefined,
      to: toDate ? localDayEndIso(toDate) : undefined,
    };
  }, [filterStudentId, filterClassId, fromDate, toDate, qDebounced]);

  const listParams = useMemo(
    () => ({
      ...filterApiParams,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filterApiParams, page],
  );

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
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.');
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

  useEffect(() => {
    if (!accessToken || !detailRow) {
      setInvoiceDetail(null);
      return;
    }
    setInvoiceLoading(true);
    void (async () => {
      try {
        const d = await getPaymentInvoiceDetail(accessToken, detailRow.id);
        setInvoiceDetail(d);
      } catch {
        setInvoiceDetail(null);
      } finally {
        setInvoiceLoading(false);
      }
    })();
  }, [accessToken, detailRow]);

  const openEdit = (row: PaymentRow) => {
    setEditForm({ receiptNumber: row.receiptNumber ?? '', note: row.note ?? '' });
    setEditOpen(true);
    setDetailRow(row);
  };

  const submitEdit = async () => {
    if (!accessToken || !writePerm || !detailRow) return;
    setSavingEdit(true);
    setError(null);
    try {
      await updatePayment(accessToken, detailRow.id, {
        receiptNumber: editForm.receiptNumber.trim() || null,
        note: editForm.note.trim() || null,
      });
      setSuccessMessage('Đã cập nhật biên lai.');
      setEditOpen(false);
      await refreshList();
      await refreshSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSavingEdit(false);
    }
  };

  const doDelete = async (id: string) => {
    if (!accessToken || !writePerm) return;
    setDeleting(true);
    setError(null);
    try {
      await deletePayment(accessToken, id);
      setSuccessMessage('Đã xóa giao dịch.');
      setDeleteConfirmId(null);
      setDetailRow(null);
      setPage(1);
      await refreshList();
      await refreshSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  if (!readPerm) {
    return (
      <div className="space-y-4">
        <h1 className="font-h1 text-primary">Hóa đơn & biên lai</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-amber-900">
          <MaterialSymbol name="lock" className="mx-auto mb-3 text-4xl opacity-70" />
          <p className="font-semibold">Tài khoản không có quyền</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-h1 text-primary">Hóa đơn & biên lai</h1>
        <p className="mt-1 text-on-surface-variant">
          Danh sách giao dịch đã thu (mỗi dòng có thể in biên lai). Kế toán / SuperAdmin có thể sửa số phiếu, ghi chú
          hoặc xóa ghi nhận sai. Ban giám hiệu: xem và in.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
      ) : null}

      <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tổng tiền (theo bộ lọc)</p>
        <p className="mt-1 text-2xl font-black text-sky-900">
          {summaryLoading ? '…' : summaryAmount != null ? formatVnd(summaryAmount) : '—'}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="min-w-[200px] flex-[2]">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Tìm theo tên học sinh</label>
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Gõ tên..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Lọc theo lớp</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-[2]">
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
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

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Giao dịch (biên lai)
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có dữ liệu phù hợp.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-4 hover:bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setDetailRow(row)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-800">
                    <MaterialSymbol name="receipt_long" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-on-background">{row.studentFullName}</p>
                    <p className="text-xs text-slate-500">
                      {formatPaidAt(row.paidAt)} · {methodLabel(row.method)}
                      {row.currentClassName ? ` · ${row.currentClassName}` : ''}
                    </p>
                    {row.feeLineDescription ? (
                      <p className="mt-0.5 text-[11px] text-slate-600">{row.feeLineDescription}</p>
                    ) : null}
                  </div>
                </button>
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-800">
                  {formatVnd(row.amount)}
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const w = openPrintTab();
                      if (!w) {
                        setError(
                          'Trình duyệt chặn cửa sổ mới. Vào biểu tượng khóa trên thanh địa chỉ → Pop-up và chuyển hướng → Cho phép cho localhost, rồi bấm In lại.',
                        );
                        return;
                      }
                      w.document.open();
                      w.document.write(
                        '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:system-ui;padding:24px">Đang tải biên lai…</body></html>',
                      );
                      w.document.close();
                      void (async () => {
                        if (!accessToken) {
                          w.close();
                          return;
                        }
                        try {
                          const d = await getPaymentInvoiceDetail(accessToken, row.id);
                          writeInvoiceToWindow(w, d);
                        } catch {
                          w.document.open();
                          w.document.write(
                            '<!DOCTYPE html><html><body style="padding:24px;color:#b91c1c;font-family:sans-serif">Không tải được biên lai. Đóng tab này và thử lại.</body></html>',
                          );
                          w.document.close();
                          setError('Không tải được chi tiết để in.');
                        }
                      })();
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-primary hover:bg-slate-50"
                  >
                    In PDF
                  </button>
                  {writePerm ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(row.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
                      >
                        Xóa
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

      {detailRow && !editOpen ? (
        <ModalPortal
          open={!!detailRow && !editOpen}
          onClose={() => setDetailRow(null)}
          backdropClassName="bg-black/50 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
              <div
                role="dialog"
                aria-modal="true"
                className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              >
                <h2 className="text-lg font-bold text-primary">Chi tiết biên lai</h2>
                {invoiceLoading ? (
                  <p className="mt-4 text-sm text-slate-500">Đang tải...</p>
                ) : invoiceDetail ? (
                  <dl className="mt-4 space-y-2 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Mã giao dịch (hệ thống)</dt>
                      <dd className="break-all font-mono text-xs text-slate-700">{invoiceDetail.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Số phiếu / biên lai (nhập tay)</dt>
                      <dd>{invoiceDetail.receiptNumber?.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Số tham chiếu in</dt>
                      <dd className="font-semibold text-primary">
                        {invoiceDetail.receiptNumber?.trim() || internalReceiptRef(invoiceDetail)}
                      </dd>
                      {!invoiceDetail.receiptNumber?.trim() ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Chưa có số phiếu — dùng mã tham chiếu tự sinh khi in. Có thể bổ sung qua nút Sửa trên dòng giao dịch.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Thời gian thanh toán</dt>
                      <dd>{formatPaidAt(invoiceDetail.paidAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Phương thức</dt>
                      <dd>{methodLabel(invoiceDetail.method)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Học sinh</dt>
                      <dd className="font-semibold">{invoiceDetail.studentFullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Mã đăng ký HS</dt>
                      <dd>{invoiceDetail.studentRegistrationCode ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Lớp</dt>
                      <dd>{invoiceDetail.currentClassName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Khoản thu</dt>
                      <dd>{invoiceDetail.feeLineDescription ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Ghi chú</dt>
                      <dd className="whitespace-pre-wrap text-slate-700">
                        {invoiceDetail.note?.trim() ? invoiceDetail.note : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Số tiền</dt>
                      <dd className="text-lg font-black text-emerald-800">{formatVnd(invoiceDetail.amount)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-rose-600">Không tải được chi tiết.</p>
                )}
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!invoiceDetail}
                    onClick={() => {
                      if (!invoiceDetail) return;
                      const w = openPrintTab();
                      if (!w) {
                        setError(
                          'Trình duyệt chặn cửa sổ mới. Cho phép pop-up cho localhost (biểu tượng khóa trên thanh địa chỉ) rồi thử lại.',
                        );
                        return;
                      }
                      writeInvoiceToWindow(w, invoiceDetail);
                    }}
                    className="w-full rounded-xl bg-primary py-3 font-bold text-white hover:bg-tertiary disabled:opacity-50"
                  >
                    In / Lưu PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailRow(null)}
                    className="w-full rounded-xl bg-slate-100 py-3 font-semibold text-slate-800 hover:bg-slate-200"
                  >
                    Đóng
                  </button>
                </div>
              </div>
        </ModalPortal>
      ) : null}

      {editOpen && detailRow ? (
        <ModalPortal
          open={editOpen && !!detailRow}
          layer="stack"
          onClose={() => {
            if (savingEdit) return;
            setEditOpen(false);
          }}
          lockBackdrop={savingEdit}
          backdropClassName="bg-black/50 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-md shrink-0"
        >
              <div role="dialog" className="w-full rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-bold text-primary">Sửa biên lai</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Chỉnh số phiếu / ghi chú cho giao dịch của <strong>{detailRow.studentFullName}</strong>.
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Số phiếu / biên lai</label>
                    <input
                      value={editForm.receiptNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, receiptNumber: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      maxLength={128}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi chú</label>
                    <textarea
                      value={editForm.note}
                      onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setEditOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => void submitEdit()}
                    className="flex-1 rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
                  >
                    {savingEdit ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
        </ModalPortal>
      ) : null}

      {deleteConfirmId ? (
        <ModalPortal
          open={!!deleteConfirmId}
          layer="top"
          onClose={() => {
            if (deleting) return;
            setDeleteConfirmId(null);
          }}
          lockBackdrop={deleting}
          backdropClassName="bg-black/50 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-sm shrink-0"
        >
              <div className="w-full rounded-2xl bg-white p-6 shadow-xl">
                <p className="font-bold text-slate-900">Xóa giao dịch này?</p>
                <p className="mt-2 text-sm text-slate-600">Thao tác không hoàn tác. Chỉ dùng khi ghi nhận sai.</p>
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void doDelete(deleteConfirmId)}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {deleting ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
