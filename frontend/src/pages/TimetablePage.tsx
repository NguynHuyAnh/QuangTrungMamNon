import { useCallback, useEffect, useState } from 'react';
import {
  getClassesForYear,
  getHomeroomOptions,
  getSchoolYearsRecent,
  type ClassRow,
  type SchoolYearRow,
  type UserOptionRow,
} from '../api/client';
import {
  createTimetableSlot,
  DAY_OF_WEEK,
  deleteTimetableSlot,
  getSubjects,
  getTimetable,
  updateTimetableSlot,
  type SubjectRow,
  type TimetableSlotRow,
  type UpsertTimetableSlotBody,
} from '../api/schoolFeatures';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';
import { ModalPortal } from '../components/ModalPortal';

function canWrite(roles: string[]) {
  return roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
}

type SlotForm = {
  dayOfWeek: number; slotNo: number; subjectId: string; teacherId: string;
  startTime: string; endTime: string; room: string; note: string;
};
const emptySlot: SlotForm = { dayOfWeek: 2, slotNo: 1, subjectId: '', teacherId: '', startTime: '', endTime: '', room: '', note: '' };
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export function TimetablePage() {
  const { accessToken, roles } = useAuth();
  const writable = canWrite(roles);

  const [years, setYears] = useState<SchoolYearRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<UserOptionRow[]>([]);
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');

  const [slots, setSlots] = useState<TimetableSlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SlotForm>(emptySlot);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  // initial: years + subjects + teachers
  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        const y = await getSchoolYearsRecent(accessToken);
        setYears(y.items);
        const current = y.items.find((x) => x.isCurrent) ?? y.items[0];
        if (current) setYearId(current.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được năm học.');
      }
      try { setSubjects((await getSubjects(accessToken, { activeOnly: true, pageSize: 200 })).items); } catch { /* ignore */ }
      try { setTeachers(await getHomeroomOptions(accessToken)); } catch { /* ignore */ }
    })();
  }, [accessToken]);

  // classes when year changes
  useEffect(() => {
    if (!accessToken || !yearId) return;
    void (async () => {
      try {
        const c = await getClassesForYear(accessToken, yearId);
        setClasses(c.items);
        setClassId((prev) => (c.items.some((x) => x.id === prev) ? prev : c.items[0]?.id ?? ''));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được lớp.');
      }
    })();
  }, [accessToken, yearId]);

  const refresh = useCallback(async () => {
    if (!accessToken || !classId || !yearId) {
      setSlots([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSlots(await getTimetable(accessToken, classId, yearId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thời khóa biểu.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, classId, yearId]);

  useEffect(() => void refresh(), [refresh]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptySlot);
    setError(null);
    setModalOpen(true);
  };
  const openEdit = (s: TimetableSlotRow) => {
    setEditId(s.id);
    setForm({
      dayOfWeek: s.dayOfWeek, slotNo: s.slotNo, subjectId: s.subjectId, teacherId: s.teacherId ?? '',
      startTime: hhmm(s.startTime), endTime: hhmm(s.endTime), room: s.room ?? '', note: s.note ?? '',
    });
    setError(null);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!accessToken || !classId || !yearId) return;
    if (!form.subjectId) {
      setError('Chọn môn học.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: UpsertTimetableSlotBody = {
      schoolYearId: yearId,
      classId,
      dayOfWeek: form.dayOfWeek,
      slotNo: Number(form.slotNo),
      subjectId: form.subjectId,
      teacherId: form.teacherId || null,
      startTime: form.startTime ? `${form.startTime}:00` : null,
      endTime: form.endTime ? `${form.endTime}:00` : null,
      room: form.room.trim() || null,
      note: form.note.trim() || null,
    };
    try {
      if (editId) { await updateTimetableSlot(accessToken, editId, body); setSuccess('Đã cập nhật tiết học.'); }
      else { await createTimetableSlot(accessToken, body); setSuccess('Đã thêm tiết học.'); }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (s: TimetableSlotRow) => {
    if (!accessToken || !window.confirm('Xóa tiết học này?')) return;
    setDeletingId(s.id);
    setError(null);
    try { await deleteTimetableSlot(accessToken, s.id); setSuccess('Đã xóa tiết học.'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Xóa thất bại.'); }
    finally { setDeletingId(null); }
  };

  const days = DAY_OF_WEEK.filter((d) => slots.some((s) => s.dayOfWeek === d.value) || writable);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Thời khóa biểu</h1>
          <p className="text-sm text-slate-500">Lịch học theo lớp và năm học.</p>
        </div>
        {writable ? (
          <button type="button" onClick={openCreate} disabled={!classId} className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><MaterialSymbol name="add" /> Thêm tiết</button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={yearId} onChange={(e) => setYearId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (hiện tại)' : ''}</option>)}
        </select>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {classes.length === 0 ? <option value="">— Chưa có lớp —</option> : null}
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error ? <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div> : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-400">Đang tải…</div>
      ) : !classId ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-400">Chọn lớp để xem thời khóa biểu.</div>
      ) : (
        <div className="space-y-4">
          {days.map((d) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === d.value).sort((a, b) => a.slotNo - b.slotNo);
            if (daySlots.length === 0 && !writable) return null;
            return (
              <div key={d.value} className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2 text-sm font-bold text-[#0B3D91]">{d.label}</div>
                {daySlots.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">Chưa có tiết.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {daySlots.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s.subjectColor ?? '#0B3D91' }}>{s.slotNo}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-on-surface">{s.subjectName}</div>
                          <div className="text-xs text-slate-400">
                            {hhmm(s.startTime) && hhmm(s.endTime) ? `${hhmm(s.startTime)}–${hhmm(s.endTime)} · ` : ''}
                            {s.teacherName ? `GV: ${s.teacherName}` : 'Chưa phân GV'}{s.room ? ` · ${s.room}` : ''}
                          </div>
                        </div>
                        {writable ? (
                          <div className="flex-shrink-0">
                            <button type="button" onClick={() => openEdit(s)} className="mr-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Sửa"><MaterialSymbol name="edit" className="text-[18px]" /></button>
                            <button type="button" onClick={() => remove(s)} disabled={deletingId === s.id} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50" title="Xóa"><MaterialSymbol name="delete" className="text-[18px]" /></button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalPortal open={modalOpen} onClose={() => setModalOpen(false)} lockBackdrop={submitting}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-on-surface">{editId ? 'Sửa tiết học' : 'Thêm tiết học'}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Thứ</span>
                <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                  {DAY_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Tiết</span><input type="number" min={1} value={form.slotNo} onChange={(e) => setForm({ ...form, slotNo: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            </div>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Môn học *</span>
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Chọn môn —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Giáo viên</span>
              <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="">— Chưa phân —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.email}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Bắt đầu</span><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Kết thúc</span><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Phòng</span><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
            </div>
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
