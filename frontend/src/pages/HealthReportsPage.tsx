import { useCallback, useEffect, useState } from 'react';
import { getMyChildren, getStudentsPaged } from '../api/client';
import {
  createHealthReport,
  deleteHealthReport,
  getHealthReports,
  updateHealthReport,
  type HealthReportRow,
  type UpsertHealthReportBody,
} from '../api/schoolFeatures';
import { isStaffRole, useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 15;

function canWrite(roles: string[]) {
  return roles.some((r) => r === 'GiaoVien' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

type StudentOption = { id: string; fullName: string };
type FormState = {
  studentId: string;
  reportDate: string;
  height: string;
  weight: string;
  temperature: string;
  heartRate: string;
  bloodPressure: string;
  symptoms: string;
  diagnosis: string;
  medication: string;
  doctorNote: string;
  parentNotified: boolean;
};
const emptyForm: FormState = {
  studentId: '', reportDate: '', height: '', weight: '', temperature: '', heartRate: '',
  bloodPressure: '', symptoms: '', diagnosis: '', medication: '', doctorNote: '', parentNotified: false,
};
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));

export function HealthReportsPage() {
  const { accessToken, roles } = useAuth();
  const staff = isStaffRole(roles);
  const writable = canWrite(roles);

  const [items, setItems] = useState<HealthReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

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
      const r = await getHealthReports(accessToken, { page, pageSize: PAGE_SIZE });
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được báo cáo sức khỏe.');
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
    setEditId(null);
    setForm({ ...emptyForm, reportDate: new Date().toISOString().slice(0, 10) });
    setError(null);
    setModalOpen(true);
    if (students.length === 0) await loadStudents();
  };
  const openEdit = async (r: HealthReportRow) => {
    setEditId(r.id);
    setForm({
      studentId: r.studentId,
      reportDate: r.reportDate,
      height: r.height != null ? String(r.height) : '',
      weight: r.weight != null ? String(r.weight) : '',
      temperature: r.temperature != null ? String(r.temperature) : '',
      heartRate: r.heartRate != null ? String(r.heartRate) : '',
      bloodPressure: r.bloodPressure ?? '',
      symptoms: r.symptoms ?? '',
      diagnosis: r.diagnosis ?? '',
      medication: r.medication ?? '',
      doctorNote: r.doctorNote ?? '',
      parentNotified: r.parentNotified,
    });
    setError(null);
    setModalOpen(true);
    if (students.length === 0) await loadStudents();
  };

  const submit = async () => {
    if (!accessToken) return;
    if (!form.studentId || !form.reportDate) {
      setError('Chọn học sinh và ngày báo cáo.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: UpsertHealthReportBody = {
      studentId: form.studentId,
      reportDate: form.reportDate,
      height: numOrNull(form.height),
      weight: numOrNull(form.weight),
      temperature: numOrNull(form.temperature),
      heartRate: numOrNull(form.heartRate),
      bloodPressure: form.bloodPressure.trim() || null,
      symptoms: form.symptoms.trim() || null,
      diagnosis: form.diagnosis.trim() || null,
      medication: form.medication.trim() || null,
      doctorNote: form.doctorNote.trim() || null,
      parentNotified: form.parentNotified,
    };
    try {
      if (editId) {
        await updateHealthReport(accessToken, editId, body);
        setSuccess('Đã cập nhật báo cáo.');
      } else {
        await createHealthReport(accessToken, body);
        setSuccess('Đã thêm báo cáo sức khỏe.');
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (r: HealthReportRow) => {
    if (!accessToken || !window.confirm(`Xóa báo cáo ngày ${r.reportDate} của ${r.studentName}?`)) return;
    setDeletingId(r.id);
    setError(null);
    try {
      await deleteHealthReport(accessToken, r.id);
      setSuccess('Đã xóa báo cáo.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Báo cáo sức khỏe</h1>
          <p className="text-sm text-slate-500">Theo dõi chỉ số sức khỏe học sinh.</p>
        </div>
        {writable ? (
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            <MaterialSymbol name="add" /> Thêm báo cáo
          </button>
        ) : null}
      </div>

      {error ? <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Học sinh</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Cao/Nặng</th>
              <th className="px-4 py-3">Nhiệt độ</th>
              <th className="px-4 py-3">Triệu chứng</th>
              <th className="px-4 py-3">Báo PH</th>
              {writable ? <th className="px-4 py-3 text-right">Thao tác</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Đang tải…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Chưa có báo cáo nào.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-on-surface">{r.studentName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.reportDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.height ?? '—'}cm / {r.weight ?? '—'}kg</td>
                  <td className="px-4 py-3">
                    <span className={r.temperature != null && r.temperature >= 37.5 ? 'font-semibold text-red-600' : ''}>{r.temperature != null ? `${r.temperature}°C` : '—'}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[14rem] truncate" title={r.symptoms ?? ''}>{r.symptoms ?? '—'}</td>
                  <td className="px-4 py-3">{r.parentNotified ? <span className="text-green-600">✓</span> : <span className="text-slate-300">—</span>}</td>
                  {writable ? (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => openEdit(r)} className="mr-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Sửa"><MaterialSymbol name="edit" className="text-[20px]" /></button>
                      <button type="button" onClick={() => remove(r)} disabled={deletingId === r.id} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50" title="Xóa"><MaterialSymbol name="delete" className="text-[20px]" /></button>
                    </td>
                  ) : null}
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
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-on-surface">{editId ? 'Sửa báo cáo' : 'Thêm báo cáo sức khỏe'}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="col-span-2 block text-sm sm:col-span-1">
              <span className="mb-1 block font-medium text-slate-600">Học sinh *</span>
              <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Chọn —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Ngày *</span>
              <input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Cao (cm)</span>
              <input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Nặng (kg)</span>
              <input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Nhiệt độ (°C)</span>
              <input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Nhịp tim</span>
              <input type="number" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Huyết áp</span>
              <input value={form.bloodPressure} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} placeholder="100/70" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="col-span-2 block text-sm sm:col-span-3">
              <span className="mb-1 block font-medium text-slate-600">Triệu chứng</span>
              <input value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="col-span-2 block text-sm sm:col-span-3">
              <span className="mb-1 block font-medium text-slate-600">Chẩn đoán / kết luận</span>
              <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="col-span-2 block text-sm sm:col-span-3">
              <span className="mb-1 block font-medium text-slate-600">Ghi chú y tế</span>
              <textarea value={form.doctorNote} onChange={(e) => setForm({ ...form, doctorNote: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-3">
              <input type="checkbox" checked={form.parentNotified} onChange={(e) => setForm({ ...form, parentNotified: e.target.checked })} />
              <span className="font-medium text-slate-600">Đã thông báo phụ huynh</span>
            </label>
          </div>
          {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
            <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{submitting ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
