import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  deleteUser,
  getUserById,
  getUsersDirectory,
  postRegisterStaff,
  putUser,
  type UserDirectoryRow,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canAccessUserDirectory, canSuperAdminManageUsers } from '../auth/staffNavAccess';
import { MaterialSymbol } from '../components/MaterialSymbol';

const PAGE_SIZE = 15;

const ALL_ASSIGNABLE_ROLES = ['SuperAdmin', 'BanGiamHieu', 'GiaoVien', 'KeToan', 'PhuHuynh'] as const;

/** Vai trò có thể gán khi tạo tài khoản nội bộ (không gồm SuperAdmin). */
type CreateStaffRole = Exclude<(typeof ALL_ASSIGNABLE_ROLES)[number], 'SuperAdmin'>;
const CREATE_ROLE_OPTIONS_SUPER: CreateStaffRole[] = ['BanGiamHieu', 'GiaoVien', 'KeToan', 'PhuHuynh'];
const CREATE_ROLE_OPTIONS_BGH: CreateStaffRole[] = ['GiaoVien', 'KeToan'];

/** Khi tài khoản cũ còn nhiều vai trò, mặc định chọn theo thứ tự ưu tiên (mạnh → yếu). */
const ROLE_PRIORITY_FOR_DEFAULT = [
  'SuperAdmin',
  'BanGiamHieu',
  'KeToan',
  'GiaoVien',
  'PhuHuynh',
] as const satisfies readonly (typeof ALL_ASSIGNABLE_ROLES)[number][];

function preferredSingleRole(existing: readonly string[]): (typeof ALL_ASSIGNABLE_ROLES)[number] {
  const s = new Set(existing);
  for (const r of ROLE_PRIORITY_FOR_DEFAULT) {
    if (s.has(r)) return r;
  }
  for (const r of ALL_ASSIGNABLE_ROLES) {
    if (s.has(r)) return r;
  }
  return 'PhuHuynh';
}

function roleLabelVi(role: string): string {
  const m: Record<string, string> = {
    SuperAdmin: 'Super admin',
    BanGiamHieu: 'Ban giám hiệu',
    GiaoVien: 'Giáo viên',
    KeToan: 'Kế toán',
    PhuHuynh: 'Phụ huynh',
  };
  return m[role] ?? role;
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

export function UsersPage() {
  const { accessToken, roles } = useAuth();
  const allowed = canAccessUserDirectory(roles);
  const superManage = canSuperAdminManageUsers(roles);
  const myUserId = tryParseJwtSub(accessToken);

  const [items, setItems] = useState<UserDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createRole, setCreateRole] = useState<CreateStaffRole>('GiaoVien');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<(typeof ALL_ASSIGNABLE_ROLES)[number]>('GiaoVien');
  const [editHadMultipleRoles, setEditHadMultipleRoles] = useState(false);
  const [editLock, setEditLock] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const load = useCallback(async () => {
    if (!accessToken || !allowed) {
      setLoading(false);
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await getUsersDirectory(accessToken, { q: q || undefined, page, pageSize: PAGE_SIZE });
      setItems(r.items);
      setTotal(r.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, allowed, page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const openEdit = useCallback(
    async (row: UserDirectoryRow) => {
      if (!accessToken || !superManage) return;
      setEditUserId(row.id);
      setEditError(null);
      setEditOpen(true);
      setEditLoading(true);
      setEditNewPassword('');
      try {
        const d = await getUserById(accessToken, row.id);
        setEditFullName(d.fullName);
        setEditEmail(d.email);
        setEditRole(preferredSingleRole(d.roles));
        setEditHadMultipleRoles(d.roles.length > 1);
        setEditLock(d.isLocked);
      } catch {
        // Vẫn mở form từ dòng danh sách (cùng id) — không chặn sửa nếu chi tiết API lỗi tạm thời
        setEditError(null);
        setEditFullName(row.fullName);
        setEditEmail(row.email);
        setEditRole(preferredSingleRole(row.roles));
        setEditHadMultipleRoles(row.roles.length > 1);
        setEditLock(!!row.isLocked);
      } finally {
        setEditLoading(false);
      }
    },
    [accessToken, superManage],
  );

  const closeEdit = () => {
    if (editBusy) return;
    setEditOpen(false);
    setEditUserId(null);
    setEditError(null);
  };

  const isEditingSelf = useMemo(() => {
    if (!editUserId || !myUserId) return false;
    return editUserId.toLowerCase() === myUserId.toLowerCase();
  }, [editUserId, myUserId]);

  async function onCreateStaff(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setCreateError(null);
    setCreateBusy(true);
    try {
      await postRegisterStaff(accessToken, {
        email: createEmail.trim(),
        password: createPassword,
        fullName: createFullName.trim(),
        role: createRole,
      });
      setSuccessMsg('Đã tạo tài khoản nội bộ.');
      setModalOpen(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreateRole('GiaoVien');
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Tạo tài khoản thất bại.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !editUserId) return;
    setEditError(null);
    setEditBusy(true);
    try {
      await putUser(accessToken, editUserId, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        roles: [editRole],
        lockoutEnabled: isEditingSelf ? false : editLock,
        newPassword: editNewPassword.trim() ? editNewPassword : null,
      });
      setSuccessMsg('Đã cập nhật tài khoản.');
      closeEdit();
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Lưu thất bại.');
    } finally {
      setEditBusy(false);
    }
  }

  async function onConfirmDelete() {
    if (!accessToken || !deleteConfirmId) return;
    try {
      await deleteUser(accessToken, deleteConfirmId);
      setSuccessMsg('Đã xóa tài khoản.');
      setDeleteConfirmId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại.');
      setDeleteConfirmId(null);
    }
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-outline-variant/40 bg-white p-lg shadow-sm">
        <p className="text-body-md text-on-surface-variant">
          Chỉ <strong>Ban giám hiệu</strong> hoặc <strong>Super admin</strong> mới xem được trang này.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const createRoleChoices: CreateStaffRole[] = superManage ? CREATE_ROLE_OPTIONS_SUPER : CREATE_ROLE_OPTIONS_BGH;

  return (
    <div className="space-y-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="font-h1 text-primary">Người dùng</h2>
          <p className="text-body-md text-on-surface-variant">
            {superManage
              ? 'Super admin tạo tài khoản Ban giám hiệu / Giáo viên / Kế toán / Phụ huynh; chỉnh sửa, khóa hoặc xóa. Mỗi tài khoản chỉ một vai trò.'
              : 'Xem danh sách tài khoản. Tạo tài khoản nội bộ (chỉ giáo viên / kế toán) — không chỉnh sửa vai trò hay xóa.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateRole('GiaoVien');
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary"
        >
          <MaterialSymbol name="person_add" className="text-[20px]" />
          Tạo tài khoản nội bộ
        </button>
      </div>

      {successMsg ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">{successMsg}</div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-error-container bg-error-container/20 px-3 py-2 text-sm text-error">{error}</div>
      ) : null}

      <div className="rounded-xl border border-outline-variant/40 bg-white p-md shadow-sm">
        <div className="mb-md flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <MaterialSymbol
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={qInput}
              onChange={(ev) => setQInput(ev.target.value)}
              placeholder="Tìm theo email hoặc họ tên…"
              className="w-full rounded-lg border border-outline-variant bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary-container"
            />
          </div>
          <p className="text-label-sm text-on-surface-variant">{loading ? 'Đang tải…' : `${total} tài khoản`}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-label-sm text-on-surface-variant">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Họ tên</th>
                <th className="py-2 pr-3 font-medium">Vai trò</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                {superManage ? <th className="py-2 font-medium text-right">Thao tác</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={superManage ? 5 : 4} className="py-8 text-center text-on-surface-variant">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : null}
              {items.map((u) => {
                const isSelf = myUserId != null && u.id.toLowerCase() === myUserId.toLowerCase();
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs text-on-surface sm:text-sm">{u.email}</td>
                    <td className="py-2.5 pr-3 text-on-surface">{u.fullName}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-on-surface-variant">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                            >
                              {roleLabelVi(r)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          <MaterialSymbol name="lock" className="text-[14px]" />
                          Đang khóa
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Hoạt động</span>
                      )}
                    </td>
                    {superManage ? (
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void openEdit(u)}
                            className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-medium text-primary hover:bg-slate-50"
                          >
                            Sửa
                          </button>
                          {!isSelf ? (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(u.id)}
                              className="rounded-lg border border-error-container/40 px-2 py-1 text-xs font-medium text-error hover:bg-error-container/10"
                            >
                              Xóa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-md flex items-center justify-between gap-2 border-t border-slate-100 pt-md">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-label-sm text-on-surface-variant">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        ) : null}
      </div>

      {modalOpen
        ? createPortal(
            <div
              role="presentation"
              className="fixed inset-0 z-[1200] overflow-y-auto bg-slate-900/45 backdrop-blur-[1px]"
              onClick={() => !createBusy && setModalOpen(false)}
            >
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-12">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="users-create-title"
                  className="my-auto w-full max-w-md shrink-0 overflow-y-auto rounded-xl border border-outline-variant bg-white p-lg shadow-xl"
                  style={{ maxHeight: 'min(90vh, calc(100vh - 5rem))' }}
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <div className="mb-md flex items-start justify-between gap-2">
                    <h3 id="users-create-title" className="font-h2 text-primary">
                      Tạo tài khoản nội bộ
                    </h3>
                    <button
                      type="button"
                      disabled={createBusy}
                      className="rounded-lg p-1 text-outline hover:bg-slate-100"
                      aria-label="Đóng"
                      onClick={() => setModalOpen(false)}
                    >
                      <MaterialSymbol name="close" />
                    </button>
                  </div>
                  <p className="mb-md text-label-sm text-on-surface-variant">
                    {superManage ? (
                      <>
                        Super admin có thể tạo tài khoản <strong>Ban giám hiệu</strong>, <strong>Giáo viên</strong>,{' '}
                        <strong>Kế toán</strong> hoặc <strong>Phụ huynh</strong> (không tạo Super admin từ đây).
                      </>
                    ) : (
                      <>
                        Ban giám hiệu chỉ được tạo vai trò <strong>Giáo viên</strong> hoặc <strong>Kế toán</strong>.
                      </>
                    )}
                  </p>
                  <form className="space-y-md pb-1" onSubmit={onCreateStaff}>
                    {createError ? (
                      <div className="rounded-lg border border-error-container bg-error-container/20 px-3 py-2 text-sm text-error">
                        {createError}
                      </div>
                    ) : null}
                    <div>
                      <label className="mb-1 block text-label-sm font-medium text-on-surface" htmlFor="staff-fullname">
                        Họ và tên
                      </label>
                      <input
                        id="staff-fullname"
                        required
                        value={createFullName}
                        onChange={(ev) => setCreateFullName(ev.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-label-sm font-medium text-on-surface" htmlFor="staff-email">
                        Email đăng nhập
                      </label>
                      <input
                        id="staff-email"
                        type="email"
                        required
                        autoComplete="off"
                        value={createEmail}
                        onChange={(ev) => setCreateEmail(ev.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-label-sm font-medium text-on-surface" htmlFor="staff-password">
                        Mật khẩu ban đầu
                      </label>
                      <input
                        id="staff-password"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={createPassword}
                        onChange={(ev) => setCreatePassword(ev.target.value)}
                        className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-label-sm font-medium text-on-surface" htmlFor="staff-role">
                        Vai trò
                      </label>
                      <select
                        id="staff-role"
                        value={createRole}
                        onChange={(ev) => setCreateRole(ev.target.value as CreateStaffRole)}
                        className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                      >
                        {createRoleChoices.map((r) => (
                          <option key={r} value={r}>
                            {roleLabelVi(r)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 pt-sm">
                      <button
                        type="button"
                        disabled={createBusy}
                        onClick={() => setModalOpen(false)}
                        className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-slate-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={createBusy}
                        className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {createBusy ? 'Đang tạo…' : 'Tạo'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {editOpen && editUserId
        ? createPortal(
            <div
              role="presentation"
              className="fixed inset-0 z-[1200] overflow-y-auto bg-slate-900/45 backdrop-blur-[1px]"
              onClick={() => !editBusy && closeEdit()}
            >
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-12">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="users-edit-title"
                  className="my-auto w-full max-w-lg shrink-0 overflow-y-auto rounded-xl border border-outline-variant bg-white p-lg shadow-xl"
                  style={{ maxHeight: 'min(90vh, calc(100vh - 5rem))' }}
                  onClick={(ev) => ev.stopPropagation()}
                >
            <div className="mb-md flex items-start justify-between gap-2">
              <h3 id="users-edit-title" className="font-h2 text-primary">
                Sửa tài khoản
              </h3>
              <button
                type="button"
                disabled={editBusy}
                className="rounded-lg p-1 text-outline hover:bg-slate-100"
                aria-label="Đóng"
                onClick={closeEdit}
              >
                <MaterialSymbol name="close" />
              </button>
            </div>
            {editLoading ? (
              <p className="text-sm text-on-surface-variant">Đang tải…</p>
            ) : (
              <form className="space-y-md pb-1" onSubmit={onSaveEdit}>
                {editError ? (
                  <div className="rounded-lg border border-error-container bg-error-container/20 px-3 py-2 text-sm text-error">
                    {editError}
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-label-sm font-medium" htmlFor="edit-fullname">
                    Họ và tên
                  </label>
                  <input
                    id="edit-fullname"
                    required
                    value={editFullName}
                    onChange={(ev) => setEditFullName(ev.target.value)}
                    className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-label-sm font-medium" htmlFor="edit-email">
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    required
                    value={editEmail}
                    onChange={(ev) => setEditEmail(ev.target.value)}
                    className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-label-sm font-medium text-on-surface" htmlFor="edit-role">
                    Vai trò
                  </label>
                  {editHadMultipleRoles ? (
                    <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      Tài khoản đang có nhiều vai trò trong hệ thống. Chọn <strong>một</strong> vai trò và nhấn Lưu để gán đúng
                      một quyền.
                    </p>
                  ) : null}
                  <select
                    id="edit-role"
                    value={editRole}
                    onChange={(ev) =>
                      setEditRole(ev.target.value as (typeof ALL_ASSIGNABLE_ROLES)[number])
                    }
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                  >
                    {ALL_ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabelVi(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editLock}
                    disabled={isEditingSelf}
                    onChange={(ev) => setEditLock(ev.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant disabled:opacity-50"
                  />
                  <span>Khóa đăng nhập (lockout)</span>
                </label>
                {isEditingSelf ? (
                  <p className="text-xs text-on-surface-variant">Không thể tự khóa tài khoản của chính mình.</p>
                ) : null}
                <div>
                  <label className="mb-1 block text-label-sm font-medium" htmlFor="edit-pw">
                    Mật khẩu mới (tùy chọn)
                  </label>
                  <input
                    id="edit-pw"
                    type="password"
                    autoComplete="new-password"
                    value={editNewPassword}
                    onChange={(ev) => setEditNewPassword(ev.target.value)}
                    placeholder="Để trống nếu không đổi"
                    className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 pt-sm">
                  <button
                    type="button"
                    disabled={editBusy}
                    onClick={closeEdit}
                    className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={editBusy}
                    className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {editBusy ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              </form>
            )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {deleteConfirmId
        ? createPortal(
            <div
              role="presentation"
              className="fixed inset-0 z-[1200] overflow-y-auto bg-slate-900/50 backdrop-blur-[1px]"
              onClick={() => setDeleteConfirmId(null)}
            >
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-12">
                <div
                  role="dialog"
                  aria-modal="true"
                  className="my-auto w-full max-w-sm shrink-0 rounded-xl border border-outline-variant bg-white p-lg shadow-xl"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <h3 className="mb-2 font-h3 text-primary">Xóa tài khoản?</h3>
                  <p className="mb-md text-sm text-on-surface-variant">
                    Thao tác không hoàn tác. Nếu tài khoản còn dữ liệu liên quan, hệ thống sẽ từ chối xóa — khi đó hãy
                    khóa tài khoản thay thế.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void onConfirmDelete()}
                      className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
