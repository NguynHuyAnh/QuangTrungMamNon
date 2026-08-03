import { useCallback, useEffect, useState } from 'react';
import { getHomeroomOptions, getStudentsPaged, type UserOptionRow } from '../api/client';
import {
  collectEnrollmentFee,
  createExternalSubject,
  deleteExternalSubject,
  enrollmentStatusLabel,
  enrollStudent,
  feePaymentStatusLabel,
  getEnrollments,
  getExternalSubjects,
  updateExternalSubject,
  withdrawEnrollment,
  type EnrollmentRow,
  type ExternalSubjectRow,
  type UpsertExternalSubjectBody,
} from '../api/schoolFeatures';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

function canWriteCatalog(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}
function canEnroll(roles: string[]) {
  return roles.some((r) => r === 'GiaoVien' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}
function canCollect(roles: string[]) {
  return roles.some((r) => r === 'KeToan' || r === 'SuperAdmin');
}

const money = (n?: number | null) => (n != null ? n.toLocaleString('vi-VN') + ' ₫' : '—');

type CatForm = { code: string; name: string; teacherId: string; feeAmount: string; maxStudents: string; isActive: boolean; note: string };
const emptyCat: CatForm = { code: '', name: '', teacherId: '', feeAmount: '', maxStudents: '', isActive: true, note: '' };

export function ExternalSubjectsPage() {
  const { accessToken, roles } = useAuth();
  const writeCatalog = canWriteCatalog(roles);
  const enroll = canEnroll(roles);
  const collect = canCollect(roles);

  const [tab, setTab] = useState<'catalog' | 'enroll'>('catalog');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // catalog
  const [subjects, setSubjects] = useState<ExternalSubjectRow[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [teachers, setTeachers] = useState<UserOptionRow[]>([]);
  const [catModal, setCatModal] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<CatForm>(emptyCat);
  const [submitting, setSubmitting] = useState(false);

  // enrollments
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [enrollForm, setEnrollForm] = useState({ studentId: '', externalSubjectId: '', enrollDate: '' });

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  const refreshCatalog = useCallback(async () => {
    if (!accessToken) return setLoadingCat(false);
    setLoadingCat(true);
    setError(null);
    try {
      const r = await getExternalSubjects(accessToken, { pageSize: 100 });
      setSubjects(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh mục môn năng khiếu.');
    } finally {
      setLoadingCat(false);
    }
  }, [accessToken]);

  const refreshEnrollments = useCallback(async () => {
    if (!accessToken) return;
    setLoadingEnroll(true);
    setError(null);
    try {
      const r = await getEnrollments(accessToken, { pageSize: 100 });
      setEnrollments(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách đăng ký.');
    } finally {
      setLoadingEnroll(false);
    }
  }, [accessToken]);

  useEffect(() => void refreshCatalog(), [refreshCatalog]);
  useEffect(() => {
    if (tab === 'enroll') void refreshEnrollments();
  }, [tab, refreshEnrollments]);

  const openCatCreate = async () => {
    setCatEditId(null);
    setCatForm(emptyCat);
    setError(null);
    setCatModal(true);
    if (teachers.length === 0 && accessToken) {
      try { setTeachers(await getHomeroomOptions(accessToken)); } catch { /* ignore */ }
    }
  };
  const openCatEdit = async (s: ExternalSubjectRow) => {
    setCatEditId(s.id);
    setCatForm({
      code: s.code, name: s.name, teacherId: s.teacherId ?? '',
      feeAmount: s.feeAmount != null ? String(s.feeAmount) : '',
      maxStudents: s.maxStudents != null ? String(s.maxStudents) : '',
      isActive: s.isActive, note: s.note ?? '',
    });
    setError(null);
    setCatModal(true);
    if (teachers.length === 0 && accessToken) {
      try { setTeachers(await getHomeroomOptions(accessToken)); } catch { /* ignore */ }
    }
  };

  const submitCat = async () => {
    if (!accessToken) return;
    if (!catForm.code.trim() || !catForm.name.trim()) {
      setError('Mã môn và tên môn không được để trống.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: UpsertExternalSubjectBody = {
      code: catForm.code.trim(),
      name: catForm.name.trim(),
      teacherId: catForm.teacherId || null,
      feeAmount: catForm.feeAmount.trim() === '' ? null : Number(catForm.feeAmount),
      maxStudents: catForm.maxStudents.trim() === '' ? null : Number(catForm.maxStudents),
      isActive: catForm.isActive,
      note: catForm.note.trim() || null,
    };
    try {
      if (catEditId) { await updateExternalSubject(accessToken, catEditId, body); setSuccess('Đã cập nhật môn.'); }
      else { await createExternalSubject(accessToken, body); setSuccess('Đã thêm môn năng khiếu.'); }
      setCatModal(false);
      await refreshCatalog();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeCat = async (s: ExternalSubjectRow) => {
    if (!accessToken || !window.confirm(`Xóa môn "${s.name}"?`)) return;
    setBusyId(s.id);
    setError(null);
    try { await deleteExternalSubject(accessToken, s.id); setSuccess('Đã xóa môn.'); await refreshCatalog(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Xóa thất bại.'); }
    finally { setBusyId(null); }
  };

  const openEnroll = async () => {
    setEnrollForm({ studentId: '', externalSubjectId: '', enrollDate: new Date().toISOString().slice(0, 10) });
    setError(null);
    setEnrollModal(true);
    if (students.length === 0 && accessToken) {
      try {
        const r = await getStudentsPaged(accessToken, { pageSize: 200 });
        setStudents(r.items.map((s) => ({ id: s.id, fullName: s.fullName })));
      } catch { /* ignore */ }
    }
    if (subjects.length === 0) await refreshCatalog();
  };

  const submitEnroll = async () => {
    if (!accessToken) return;
    if (!enrollForm.studentId || !enrollForm.externalSubjectId || !enrollForm.enrollDate) {
      setError('Chọn học sinh, môn và ngày đăng ký.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await enrollStudent(accessToken, enrollForm);
      setSuccess('Đã đăng ký môn cho học sinh.');
      setEnrollModal(false);
      await refreshEnrollments();
      await refreshCatalog();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng ký thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (fn: () => Promise<void>, id: string, ok: string) => {
    if (!accessToken) return;
    setBusyId(id);
    setError(null);
    try { await fn(); setSuccess(ok); await refreshEnrollments(); await refreshCatalog(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Thao tác thất bại.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">Môn năng khiếu</h1>
        <p className="text-sm text-slate-500">Danh mục môn ngoài giờ, đăng ký học sinh và thu học phí.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setTab('catalog')} className={`px-4 py-2 text-sm font-semibold ${tab === 'catalog' ? 'border-b-2 border-[#0B3D91] text-[#0B3D91]' : 'text-slate-500'}`}>Danh mục môn</button>
        <button type="button" onClick={() => setTab('enroll')} className={`px-4 py-2 text-sm font-semibold ${tab === 'enroll' ? 'border-b-2 border-[#0B3D91] text-[#0B3D91]' : 'text-slate-500'}`}>Đăng ký & học phí</button>
      </div>

      {error ? <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div> : null}

      {tab === 'catalog' ? (
        <div className="space-y-3">
          {writeCatalog ? (
            <div className="flex justify-end">
              <button type="button" onClick={openCatCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"><MaterialSymbol name="add" /> Thêm môn</button>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Tên môn</th>
                  <th className="px-4 py-3">Học phí</th>
                  <th className="px-4 py-3">Sĩ số</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  {writeCatalog ? <th className="px-4 py-3 text-right">Thao tác</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingCat ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Đang tải…</td></tr>
                ) : subjects.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Chưa có môn năng khiếu nào.</td></tr>
                ) : (
                  subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                      <td className="px-4 py-3 font-medium text-on-surface">{s.name}{s.teacherName ? <span className="ml-1 text-xs text-slate-400">· {s.teacherName}</span> : null}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(s.feeAmount)}</td>
                      <td className="px-4 py-3">{s.activeCount}{s.maxStudents != null ? `/${s.maxStudents}` : ''}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{s.isActive ? 'Đang mở' : 'Đã tắt'}</span></td>
                      {writeCatalog ? (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button type="button" onClick={() => openCatEdit(s)} className="mr-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Sửa"><MaterialSymbol name="edit" className="text-[20px]" /></button>
                          <button type="button" onClick={() => removeCat(s)} disabled={busyId === s.id} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50" title="Xóa"><MaterialSymbol name="delete" className="text-[20px]" /></button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {enroll ? (
            <div className="flex justify-end">
              <button type="button" onClick={openEnroll} className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"><MaterialSymbol name="person_add" /> Đăng ký học sinh</button>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3">Môn</th>
                  <th className="px-4 py-3">Học phí</th>
                  <th className="px-4 py-3">Đăng ký</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Học phí</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingEnroll ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Đang tải…</td></tr>
                ) : enrollments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Chưa có đăng ký nào.</td></tr>
                ) : (
                  enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-on-surface">{e.studentName}</td>
                      <td className="px-4 py-3">{e.externalSubjectName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(e.feeAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.enrollDate}{e.withdrawDate ? ` → ${e.withdrawDate}` : ''}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{enrollmentStatusLabel(e.status)}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.paymentStatus === 1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{feePaymentStatusLabel(e.paymentStatus)}</span></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {collect && e.paymentStatus === 0 && e.status === 0 ? (
                          <button type="button" disabled={busyId === e.id} onClick={() => act(() => collectEnrollmentFee(accessToken!, e.id), e.id, 'Đã xác nhận thu học phí.')} className="mr-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50">Thu phí</button>
                        ) : null}
                        {enroll && e.status === 0 ? (
                          <button type="button" disabled={busyId === e.id} onClick={() => { if (window.confirm('Hủy/rút đăng ký này?')) void act(() => withdrawEnrollment(accessToken!, e.id), e.id, 'Đã hủy đăng ký.'); }} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalPortal open={catModal} onClose={() => setCatModal(false)} lockBackdrop={submitting}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-on-surface">{catEditId ? 'Sửa môn năng khiếu' : 'Thêm môn năng khiếu'}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Mã môn *</span><input value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Tên môn *</span><input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            </div>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Giáo viên phụ trách</span>
              <select value={catForm.teacherId} onChange={(e) => setCatForm({ ...catForm, teacherId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Không gán —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Học phí (₫)</span><input type="number" min={0} value={catForm.feeAmount} onChange={(e) => setCatForm({ ...catForm, feeAmount: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Sĩ số tối đa</span><input type="number" min={1} value={catForm.maxStudents} onChange={(e) => setCatForm({ ...catForm, maxStudents: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            </div>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Ghi chú</span><textarea value={catForm.note} onChange={(e) => setCatForm({ ...catForm, note: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={catForm.isActive} onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })} /><span className="font-medium text-slate-600">Đang mở đăng ký</span></label>
          </div>
          {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setCatModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
            <button type="button" onClick={submitCat} disabled={submitting} className="rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{submitting ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal open={enrollModal} onClose={() => setEnrollModal(false)} lockBackdrop={submitting}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-on-surface">Đăng ký môn năng khiếu</h2>
          <div className="space-y-3">
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Học sinh *</span>
              <select value={enrollForm.studentId} onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Chọn học sinh —</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </label>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Môn *</span>
              <select value={enrollForm.externalSubjectId} onChange={(e) => setEnrollForm({ ...enrollForm, externalSubjectId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Chọn môn —</option>
                {subjects.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.activeCount}{s.maxStudents != null ? `/${s.maxStudents}` : ''})</option>)}
              </select>
            </label>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Ngày đăng ký *</span><input type="date" value={enrollForm.enrollDate} onChange={(e) => setEnrollForm({ ...enrollForm, enrollDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          </div>
          {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setEnrollModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
            <button type="button" onClick={submitEnroll} disabled={submitting} className="rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{submitting ? 'Đang lưu…' : 'Đăng ký'}</button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
