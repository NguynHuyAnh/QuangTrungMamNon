import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAnnouncement,
  getAnnouncementsPaged,
  getClassesPaged,
  getSchoolYearsCurrent,
  getSchoolYearsRecent,
  postAnnouncementDraft,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementRow,
  type ClassRow,
  type CreateAnnouncementDraftBody,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

const PAGE_SIZE = 12;

function canCreateDraft(roles: string[]) {
  return roles.some((r) => r === 'GiaoVien' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function canPublish(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function scopeLabel(scope: number): string {
  return scope === 0 ? 'Toàn trường' : 'Theo lớp';
}

function statusLabel(status: number): string {
  return status === 0 ? 'Bản nháp' : 'Đã đăng';
}

function formatDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tryParseJwtSub(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const norm = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4));
    const json = JSON.parse(atob(norm + pad)) as { sub?: string };
    return json.sub ?? null;
  } catch {
    return null;
  }
}

export function AnnouncementsPage() {
  const { accessToken, roles } = useAuth();
  const draftPerm = canCreateDraft(roles);
  const publishPerm = canPublish(roles);
  const myUserId = tryParseJwtSub(accessToken);

  const [schoolYearLabel, setSchoolYearLabel] = useState('');
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [qInput, setQInput] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [filterClassId, setFilterClassId] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<AnnouncementRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState({ title: '', body: '', scope: 0, classId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, statusFilter, filterClassId]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const loadCatalog = useCallback(async () => {
    if (!accessToken) return;
    try {
      let sy = await getSchoolYearsCurrent(accessToken);
      if (sy.items.length === 0) sy = await getSchoolYearsRecent(accessToken);
      const y = sy.items[0];
      if (!y) {
        setSchoolYearLabel('');
        setClasses([]);
        return;
      }
      setSchoolYearLabel(y.name);
      const cl = await getClassesPaged(accessToken, { schoolYearId: y.id, pageSize: 200 });
      setClasses(cl.items);
    } catch {
      setClasses([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const classNameById = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);

  const listParams = useMemo(
    () => ({
      q: qDebounced || undefined,
      status: statusFilter === '' ? undefined : Number(statusFilter),
      classId: filterClassId || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [qDebounced, statusFilter, filterClassId, page],
  );

  const refreshList = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getAnnouncementsPaged(accessToken, listParams);
      setItems(r.items);
      setTotalCount(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông báo.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, listParams]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  const openCreate = () => {
    setError(null);
    setForm({
      title: '',
      body: '',
      scope: 0,
      classId: classes[0]?.id ?? '',
    });
    setCreateOpen(true);
  };

  const submitDraft = async () => {
    if (!accessToken || !form.title.trim()) return;
    if (form.scope === 1 && !form.classId) {
      setError('Chọn lớp khi phạm vi là “Theo lớp”.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: CreateAnnouncementDraftBody = {
      title: form.title.trim(),
      body: form.body,
      scope: form.scope,
      classId: form.scope === 1 ? form.classId : null,
    };
    try {
      await postAnnouncementDraft(accessToken, body);
      setSuccessMessage('Đã lưu bản nháp thông báo.');
      setCreateOpen(false);
      setPage(1);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo nháp thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const doPublish = async (id: string): Promise<boolean> => {
    if (!accessToken || !publishPerm) return false;
    setPublishingId(id);
    setError(null);
    try {
      await publishAnnouncement(accessToken, id);
      setSuccessMessage('Đã đăng thông báo.');
      await refreshList();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng thất bại.');
      return false;
    } finally {
      setPublishingId(null);
    }
  };

  const canEditAnnouncement = (a: AnnouncementRow) => {
    if (a.status === 1) return publishPerm;
    return draftPerm && (publishPerm || (myUserId != null && a.createdByUserId === myUserId));
  };

  const canDeleteAnnouncement = (a: AnnouncementRow) => canEditAnnouncement(a);

  const openEdit = (a: AnnouncementRow) => {
    setDetailRow(null);
    setError(null);
    setEditRow(a);
    setForm({
      title: a.title,
      body: a.body,
      scope: a.scope,
      classId: a.classId ?? classes[0]?.id ?? '',
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!accessToken || !editRow) return;
    if (!form.title.trim()) return;
    if (form.scope === 1 && !form.classId) {
      setError('Chọn lớp khi phạm vi là “Theo lớp”.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: CreateAnnouncementDraftBody = {
      title: form.title.trim(),
      body: form.body,
      scope: form.scope,
      classId: form.scope === 1 ? form.classId : null,
    };
    try {
      await updateAnnouncement(accessToken, editRow.id, body);
      setSuccessMessage('Đã cập nhật thông báo.');
      setEditOpen(false);
      setEditRow(null);
      setDetailRow(null);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async (id: string) => {
    if (!accessToken) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteAnnouncement(accessToken, id);
      setSuccessMessage('Đã xóa thông báo.');
      setDetailRow(null);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-h1 text-primary">Thông báo</h1>
          <p className="mt-1 text-on-surface-variant">
            Tin nhắn toàn trường hoặc theo lớp — nháp và đăng theo quyền
            {schoolYearLabel ? <span className="text-slate-400"> · {schoolYearLabel}</span> : null}
          </p>
        </div>
        {draftPerm ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-tertiary"
          >
            <MaterialSymbol name="add" />
            Tạo thông báo
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Tìm kiếm</label>
          <div className="relative">
            <MaterialSymbol
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Tiêu đề hoặc nội dung..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả</option>
            <option value="0">Bản nháp</option>
            <option value="1">Đã đăng</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Lọc theo lớp</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả (kèm toàn trường)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600">
          Danh sách thông báo
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-slate-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-500">Chưa có thông báo phù hợp.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-slate-50/50"
              >
                <button
                  type="button"
                  onClick={() => setDetailRow(a)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-secondary-container">
                    <MaterialSymbol name="campaign" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-on-background">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {scopeLabel(a.scope)}
                      {a.scope === 1 && a.classId ? ` · ${classNameById[a.classId] ?? 'Lớp'}` : ''} · Tạo{' '}
                      {formatDt(a.createdAt)}
                    </p>
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      a.status === 0
                        ? 'rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800'
                        : 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800'
                    }
                  >
                    {statusLabel(a.status)}
                  </span>
                  {canEditAnnouncement(a) ? (
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Sửa
                    </button>
                  ) : null}
                  {canDeleteAnnouncement(a) ? (
                    <button
                      type="button"
                      disabled={deletingId === a.id}
                      onClick={() => {
                        if (window.confirm('Xóa thông báo này?')) void doDelete(a.id);
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingId === a.id ? '…' : 'Xóa'}
                    </button>
                  ) : null}
                  {publishPerm && a.status === 0 ? (
                    <button
                      type="button"
                      disabled={publishingId === a.id}
                      onClick={() => void doPublish(a.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-tertiary disabled:opacity-50"
                    >
                      {publishingId === a.id ? 'Đang đăng...' : 'Đăng'}
                    </button>
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_left" />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
              >
                <MaterialSymbol name="chevron_right" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {createOpen ? (
        <ModalPortal
          open={createOpen}
          onClose={() => {
            if (submitting) return;
            setCreateOpen(false);
          }}
          lockBackdrop={submitting}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-lg shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">Tạo thông báo (nháp)</h3>
                <p className="text-sm text-white/70">Lưu nháp trước; Ban giám hiệu / SuperAdmin có thể đăng sau.</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCreateOpen(false)}
                className="text-white/50 hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tiêu đề</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Tiêu đề thông báo"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nội dung</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Nội dung chi tiết..."
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Phạm vi</p>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      checked={form.scope === 0}
                      onChange={() => setForm((f) => ({ ...f, scope: 0 }))}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm font-medium">Toàn trường</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      checked={form.scope === 1}
                      onChange={() => setForm((f) => ({ ...f, scope: 1 }))}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm font-medium">Theo lớp</span>
                  </label>
                </div>
              </div>
              {form.scope === 1 ? (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Lớp</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Chọn lớp —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {classes.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-700">Chưa có lớp trong năm học hiện tại.</p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submitting || !form.title.trim()}
                  onClick={() => void submitDraft()}
                  className="flex-[2] rounded-xl bg-primary py-3 font-bold text-white shadow-lg hover:bg-tertiary disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu nháp'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {detailRow ? (
        <ModalPortal
          open={!!detailRow}
          onClose={() => {
            if (publishingId === detailRow.id || deletingId === detailRow.id) return;
            setDetailRow(null);
          }}
          lockBackdrop={publishingId === detailRow.id || deletingId === detailRow.id}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-lg shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <h3 className="pr-4 font-h3 text-primary">{detailRow.title}</h3>
              <button
                type="button"
                disabled={publishingId === detailRow.id || deletingId === detailRow.id}
                onClick={() => setDetailRow(null)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-3 p-6">
              <p className="text-xs text-slate-500">
                {scopeLabel(detailRow.scope)}
                {detailRow.scope === 1 && detailRow.classId
                  ? ` · ${classNameById[detailRow.classId] ?? detailRow.classId}`
                  : ''}{' '}
                · {statusLabel(detailRow.status)}
              </p>
              <p className="text-xs text-slate-500">
                Tạo: {formatDt(detailRow.createdAt)}
                {detailRow.publishedAt ? ` · Đăng: ${formatDt(detailRow.publishedAt)}` : ''}
              </p>
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {detailRow.body || '(Không có nội dung)'}
              </div>
              {publishPerm && detailRow.status === 0 ? (
                <button
                  type="button"
                  disabled={publishingId === detailRow.id}
                  onClick={() => {
                    void (async () => {
                      const ok = await doPublish(detailRow.id);
                      if (ok) setDetailRow(null);
                    })();
                  }}
                  className="w-full rounded-xl bg-primary py-3 font-bold text-white hover:bg-tertiary disabled:opacity-50"
                >
                  {publishingId === detailRow.id ? 'Đang đăng...' : 'Đăng thông báo'}
                </button>
              ) : null}
              {canEditAnnouncement(detailRow) ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openEdit(detailRow);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-800 hover:bg-slate-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === detailRow.id}
                    onClick={() => {
                      if (window.confirm('Xóa thông báo này?')) void doDelete(detailRow.id);
                    }}
                    className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-3 font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deletingId === detailRow.id ? '…' : 'Xóa'}
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                disabled={publishingId === detailRow.id || deletingId === detailRow.id}
                onClick={() => setDetailRow(null)}
                className="w-full rounded-xl bg-slate-100 py-3 font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {editOpen && editRow ? (
        <ModalPortal
          open={editOpen && !!editRow}
          onClose={() => {
            if (submitting) return;
            setEditOpen(false);
            setEditRow(null);
          }}
          lockBackdrop={submitting}
          backdropClassName="bg-slate-900/60 backdrop-blur-[1px]"
          panelWrapperClassName="my-auto w-full max-w-lg shrink-0"
        >
          <div className="max-h-[min(90vh,calc(100vh-5rem))] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-primary p-6 text-white">
              <div>
                <h3 className="font-h3 text-h3">Sửa thông báo</h3>
                <p className="text-sm text-white/70">Lưu thay đổi theo quyền của bạn.</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setEditOpen(false);
                  setEditRow(null);
                }}
                className="text-white/50 hover:text-white disabled:opacity-40"
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tiêu đề</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nội dung</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Phạm vi</p>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="edit-scope"
                      checked={form.scope === 0}
                      onChange={() => setForm((f) => ({ ...f, scope: 0 }))}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm font-medium">Toàn trường</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="edit-scope"
                      checked={form.scope === 1}
                      onChange={() => setForm((f) => ({ ...f, scope: 1 }))}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm font-medium">Theo lớp</span>
                  </label>
                </div>
              </div>
              {form.scope === 1 ? (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Lớp</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Chọn lớp —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setEditOpen(false);
                    setEditRow(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submitting || !form.title.trim()}
                  onClick={() => void submitEdit()}
                  className="flex-[2] rounded-xl bg-primary py-3 font-bold text-white shadow-lg hover:bg-tertiary disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
