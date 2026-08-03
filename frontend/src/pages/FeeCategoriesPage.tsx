import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  type FeeCategoryRow,
  type UpsertFeeCategoryBody,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

function canWriteCategories(roles: string[]) {
  return roles.includes('SuperAdmin');
}

export function FeeCategoriesPage() {
  const { accessToken, roles } = useAuth();
  const writable = canWriteCategories(roles);

  const [items, setItems] = useState<FeeCategoryRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getFeeCategories(accessToken);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh mục loại phí.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)),
    );
  }, [items, q]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: FeeCategoryRow) => {
    setEditId(cat.id);
    setForm({ name: cat.name, description: cat.description || '' });
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditId(null);
    setError(null);
  };

  const submit = async () => {
    if (!accessToken) return;
    if (!form.name.trim()) {
      setError('Tên loại phí không được để trống.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: UpsertFeeCategoryBody = {
      name: form.name.trim(),
      description: form.description.trim(),
    };
    try {
      if (editId) {
        await updateFeeCategory(accessToken, editId, body);
        setSuccess('Đã cập nhật loại phí.');
      } else {
        await createFeeCategory(accessToken, body);
        setSuccess('Đã thêm loại phí mới.');
      }
      setModalOpen(false);
      setEditId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được loại phí.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (cat: FeeCategoryRow) => {
    if (!accessToken || !window.confirm(`Xóa loại phí "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    setError(null);
    try {
      await deleteFeeCategory(accessToken, cat.id);
      setSuccess('Đã xóa loại phí.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại. Loại phí có thể đang được sử dụng.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Danh mục Loại phí</h1>
          <p className="text-sm text-slate-500">Quản lý loại phí dùng để phân loại cho biểu phí.</p>
        </div>
        {writable ? (
          <button
            id="fee-cat-add-btn"
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            <MaterialSymbol name="add" /> Thêm loại phí
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{success}</div>
      ) : null}

      <div className="relative max-w-sm">
        <MaterialSymbol
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          id="fee-cat-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên..."
          className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#0B3D91] outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Tên loại phí</th>
              <th className="px-4 py-3">Mô tả</th>
              {writable ? <th className="px-4 py-3 text-right">Thao tác</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={writable ? 3 : 2} className="px-4 py-8 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={writable ? 3 : 2} className="px-4 py-8 text-center text-slate-400">
                  Chưa có loại phí nào.
                </td>
              </tr>
            ) : (
              filteredItems.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-on-surface">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-600">{cat.description || '—'}</td>
                  {writable ? (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          id={`fee-cat-edit-${cat.id}`}
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0B3D91] transition"
                          title="Sửa"
                        >
                          <MaterialSymbol name="edit" />
                        </button>
                        <button
                          id={`fee-cat-delete-${cat.id}`}
                          type="button"
                          onClick={() => void remove(cat)}
                          disabled={deletingId === cat.id}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition disabled:opacity-50"
                          title="Xóa"
                        >
                          {deletingId === cat.id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <MaterialSymbol name="delete" />
                          )}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalPortal
        open={modalOpen}
        onClose={closeModal}
        lockBackdrop={submitting}
        backdropClassName="bg-black/40 backdrop-blur-[1px]"
        panelWrapperClassName="my-auto w-full max-w-md shrink-0"
      >
        <div className="w-full rounded-xl bg-white p-6 shadow-xl border border-slate-100">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-on-surface">
              {editId ? 'Sửa loại phí' : 'Thêm loại phí mới'}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <MaterialSymbol name="close" />
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label htmlFor="fee-cat-name" className="mb-1 block text-xs font-semibold text-slate-600">
                Tên loại phí <span className="text-red-500">*</span>
              </label>
              <input
                id="fee-cat-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
                placeholder="Ví dụ: Học phí, Tiền ăn, Năng khiếu..."
                maxLength={128}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B3D91] outline-none"
              />
            </div>
            <div>
              <label htmlFor="fee-cat-desc" className="mb-1 block text-xs font-semibold text-slate-600">
                Mô tả
              </label>
              <textarea
                id="fee-cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Nhập mô tả cho loại phí này..."
                rows={3}
                maxLength={256}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B3D91] outline-none resize-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              id="fee-cat-cancel-btn"
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              id="fee-cat-save-btn"
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="rounded-lg bg-[#0B3D91] px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
