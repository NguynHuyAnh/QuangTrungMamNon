import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
  type SubjectRow,
  type UpsertSubjectBody,
} from '../api/schoolFeatures';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 15;

type FormState = { code: string; name: string; description: string; colorCode: string; isActive: boolean };
const emptyForm: FormState = { code: '', name: '', description: '', colorCode: '#0B3D91', isActive: true };

function canWrite(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

export function SubjectsPage() {
  const { accessToken, roles } = useAuth();
  const writable = canWrite(roles);

  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SubjectRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);
  useEffect(() => setPage(1), [qDebounced]);
  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  const listParams = useMemo(() => ({ q: qDebounced || undefined, page, pageSize: PAGE_SIZE }), [qDebounced, page]);

  const refresh = useCallback(async () => {
    if (!accessToken) return setLoading(false);
    setLoading(true);
    setError(null);
    try {
      const r = await getSubjects(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh mục môn học.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, listParams]);

  useEffect(() => void refresh(), [refresh]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };
  const openEdit = (s: SubjectRow) => {
    setEditId(s.id);
    setForm({
      code: s.code,
      name: s.name,
      description: s.description ?? '',
      colorCode: s.colorCode ?? '#0B3D91',
      isActive: s.isActive,
    });
    setError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!accessToken) return;
    if (!form.code.trim() || !form.name.trim()) {
      setError('Mã môn và tên môn không được để trống.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: UpsertSubjectBody = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      colorCode: form.colorCode.trim() || null,
      isActive: form.isActive,
    };
    try {
      if (editId) {
        await updateSubject(accessToken, editId, body);
        setSuccess('Đã cập nhật môn học.');
      } else {
        await createSubject(accessToken, body);
        setSuccess('Đã thêm môn học.');
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (s: SubjectRow) => {
    if (!accessToken || !window.confirm(`Xóa môn "${s.name}"?`)) return;
    setDeletingId(s.id);
    setError(null);
    try {
      await deleteSubject(accessToken, s.id);
      setSuccess('Đã xóa môn học.');
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
          <h1 className="text-xl font-bold text-on-surface">Danh mục môn học</h1>
          <p className="text-sm text-slate-500">Môn chính khóa dùng cho thời khóa biểu.</p>
        </div>
        {writable ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <MaterialSymbol name="add" /> Thêm môn
          </button>
        ) : null}
      </div>

      {error ? <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div> : null}

      <div className="relative max-w-sm">
        <MaterialSymbol name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Tìm theo tên / mã môn..."
          className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#0B3D91]"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên môn</th>
              <th className="px-4 py-3">Màu</th>
              <th className="px-4 py-3">Trạng thái</th>
              {writable ? <th className="px-4 py-3 text-right">Thao tác</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Đang tải…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Chưa có môn học nào.</td></tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block h-5 w-5 rounded border border-slate-200" style={{ background: s.colorCode ?? '#fff' }} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.isActive ? 'Đang dùng' : 'Đã tắt'}
                    </span>
                  </td>
                  {writable ? (
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(s)} className="mr-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Sửa">
                        <MaterialSymbol name="edit" className="text-[20px]" />
                      </button>
                      <button type="button" onClick={() => remove(s)} disabled={deletingId === s.id} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50" title="Xóa">
                        <MaterialSymbol name="delete" className="text-[20px]" />
                      </button>
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-on-surface">{editId ? 'Sửa môn học' : 'Thêm môn học'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">Mã môn *</span>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">Màu hiển thị</span>
                  <input type="color" value={form.colorCode} onChange={(e) => setForm({ ...form, colorCode: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-1 py-1" />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Tên môn *</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Mô tả</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span className="font-medium text-slate-600">Đang sử dụng</span>
              </label>
            </div>
            {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
              <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {submitting ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
      </ModalPortal>
    </div>
  );
}
