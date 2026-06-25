import { useCallback, useEffect, useState } from 'react';
import { getMyChildren, getStudentsPaged } from '../api/client';
import {
  approveStudentLeave,
  cancelStudentLeave,
  createStudentLeave,
  getStudentLeaves,
  leaveStatusLabel,
  rejectStudentLeave,
  type StudentLeaveRow,
} from '../api/schoolFeatures';
import { isStaffRole, useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 15;

function canApprove(roles: string[]) {
  return roles.some((r) => r === 'GiaoVien' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

const statusBadge: Record<number, string> = {
  0: 'bg-amber-100 text-amber-700',
  1: 'bg-green-100 text-green-700',
  2: 'bg-red-100 text-red-700',
  3: 'bg-slate-100 text-slate-500',
};

type StudentOption = { id: string; fullName: string };

export function StudentLeavePage() {
  const { accessToken, roles } = useAuth();
  const staff = isStaffRole(roles);
  const approver = canApprove(roles);

  const [items, setItems] = useState<StudentLeaveRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ studentId: '', fromDate: '', toDate: '', reason: '', attachmentUrl: '' });

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  const refresh = useCallback(async () => {
    if (!accessToken) return setLoading(false);
    setLoading(true);
    setError(null);
    try {
      const r = await getStudentLeaves(accessToken, { page, pageSize: PAGE_SIZE });
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => void refresh(), [refresh]);

  const loadStudents = useCallback(async () => {
    if (!accessToken) return;
    try {
      if (staff) {
        const r = await getStudentsPaged(accessToken, { pageSize: 200 });
        setStudents(r.items.map((s) => ({ id: s.id, fullName: s.fullName })));
      } else {
        const r = await getMyChildren(accessToken);
        setStudents(r.map((s) => ({ id: s.id, fullName: s.fullName })));
      }
    } catch {
      setStudents([]);
    }
  }, [accessToken, staff]);

  const openCreate = async () => {
    setForm({ studentId: '', fromDate: '', toDate: '', reason: '', attachmentUrl: '' });
    setError(null);
    setModalOpen(true);
    if (students.length === 0) await loadStudents();
  };

  const submit = async () => {
    if (!accessToken) return;
    if (!form.studentId || !form.fromDate || !form.toDate || !form.reason.trim()) {
      setError('Chọn học sinh, ngày và nhập lý do.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createStudentLeave(accessToken, {
        studentId: form.studentId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
        attachmentUrl: form.attachmentUrl.trim() || null,
      });
      setSuccess('Đã gửi đơn nghỉ phép.');
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi đơn thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (fn: () => Promise<void>, id: string, ok: string) => {
    if (!accessToken) return;
    setBusyId(id);
    setError(null);
    try {
      await fn();
      setSuccess(ok);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Đơn nghỉ phép học sinh</h1>
          <p className="text-sm text-slate-500">Duyệt đơn sẽ tự ghi điểm danh "Nghỉ có phép" (T2–T6).</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          <MaterialSymbol name="add" /> Gửi đơn
        </button>
      </div>

      {error ? <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Học sinh</th>
              <th className="px-4 py-3">Từ – đến</th>
              <th className="px-4 py-3">Lý do</th>
              <th className="px-4 py-3">Người gửi</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Đang tải…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Chưa có đơn nào.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-on-surface">{r.studentName || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.fromDate} → {r.toDate}</td>
                  <td className="px-4 py-3 max-w-[16rem] truncate" title={r.reason}>{r.reason}</td>
                  <td className="px-4 py-3 text-slate-500">{r.requestedByName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[r.status]}`}>{leaveStatusLabel(r.status)}</span>
                    {r.rejectReason ? <div className="mt-1 text-xs text-red-400">{r.rejectReason}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {approver && r.status === 0 ? (
                      <>
                        <button type="button" disabled={busyId === r.id} onClick={() => act(() => approveStudentLeave(accessToken!, r.id), r.id, 'Đã duyệt & ghi điểm danh.')} className="mr-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50">Duyệt</button>
                        <button type="button" disabled={busyId === r.id} onClick={() => { const note = window.prompt('Lý do từ chối (tùy chọn):') ?? undefined; void act(() => rejectStudentLeave(accessToken!, r.id, note), r.id, 'Đã từ chối đơn.'); }} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">Từ chối</button>
                      </>
                    ) : null}
                    {r.status === 0 ? (
                      <button type="button" disabled={busyId === r.id} onClick={() => act(() => cancelStudentLeave(accessToken!, r.id), r.id, 'Đã hủy đơn.')} className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Trước</button>
          <span className="text-slate-500">Trang {page}/{totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Sau</button>
        </div>
      ) : null}

      <ModalPortal open={modalOpen} onClose={() => setModalOpen(false)} lockBackdrop={submitting}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-on-surface">Gửi đơn nghỉ phép</h2>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Học sinh *</span>
              <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Chọn học sinh —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Từ ngày</span>
                <input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Đến ngày</span>
                <input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Lý do *</span>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Ảnh đính kèm (URL)</span>
              <input value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} placeholder="https://…" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
            <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{submitting ? 'Đang gửi…' : 'Gửi đơn'}</button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
