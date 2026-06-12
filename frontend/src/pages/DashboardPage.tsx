import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardExportReport, getStaffDashboardSummary, type StaffSummary } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  canExportDashboardReport,
  canStaffAccessAttendanceNav,
  canStaffAccessStudentsNav,
} from '../auth/staffNavAccess';
import { MaterialSymbol } from '../components/MaterialSymbol';

const money = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

function sixMonthLabelsUtc(): string[] {
  const labels: string[] = [];
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let k = 0; k < 6; k++) {
    const d = new Date(Date.UTC(y, m - 5 + k, 1));
    labels.push(d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric', timeZone: 'UTC' }));
  }
  return labels;
}

const sliceColors = ['#0B3D91', '#1565C0', '#42A5F5', '#90CAF9'];

function buildEnrollmentLinePath(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(1, ...values);
  const w = 1000;
  const h = 100;
  const pad = 8;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - pad - (v / max) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${pts.join(' L ')}`;
}

function dashboardView(roles: string[]): 'leadership' | 'teacher' | 'accountant' {
  const leadership = roles.some((r) => r === 'BanGiamHieu' || r === 'SuperAdmin');
  if (leadership) return 'leadership';
  if (roles.some((r) => r === 'KeToan')) return 'accountant';
  if (roles.some((r) => r === 'GiaoVien')) return 'teacher';
  return 'leadership';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type ChartsProps = {
  monthLabels: string[];
  enrollSeries: number[];
  enrollPath: string;
  enrollAreaPath: string;
  ageSlices: { label: string; count: number }[];
  studentCount: number | undefined;
  chartTitle: string;
  chartSubtitle: string;
  ageTitle?: string;
  ageSubtitle?: string;
};

function DashboardChartsBlock({
  monthLabels,
  enrollSeries,
  enrollPath,
  enrollAreaPath,
  ageSlices,
  studentCount,
  chartTitle,
  chartSubtitle,
  ageTitle = 'Học sinh theo độ tuổi',
  ageSubtitle = 'Ước tính từ ngày sinh (tính đến hôm nay, UTC)',
}: ChartsProps) {
  return (
    <div className="mb-xl grid grid-cols-1 gap-gutter lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-lg shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-h3 text-on-background">{chartTitle}</h3>
            <p className="text-sm text-slate-500">{chartSubtitle}</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4">
          <svg className="h-48 w-full" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="enrollFillDash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0B3D91" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0B3D91" stopOpacity="0" />
              </linearGradient>
            </defs>
            {enrollAreaPath ? <path d={enrollAreaPath} fill="url(#enrollFillDash)" stroke="none" /> : null}
            {enrollPath ? (
              <path d={enrollPath} fill="none" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </svg>
          <div className="mt-2 grid grid-cols-6 gap-1 border-t border-slate-200/80 pt-2 text-center text-[10px] font-medium text-slate-500">
            {monthLabels.map((lab, i) => (
              <div key={`${i}-${lab}`} className="min-w-0">
                <div className="truncate">{lab}</div>
                <div className="font-bold text-primary">{enrollSeries[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-lg shadow-sm">
        <h3 className="font-h3 mb-1 text-on-background">{ageTitle}</h3>
        <p className="mb-4 text-sm text-slate-500">{ageSubtitle}</p>
        <div className="space-y-3">
          {ageSlices.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            ageSlices.map((s, i) => {
              const pct = studentCount && studentCount > 0 ? Math.round((s.count / studentCount) * 100) : 0;
              const color = sliceColors[i % sliceColors.length]!;
              return (
                <div key={s.label}>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                    <span>{s.label}</span>
                    <span>
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
          Tổng trong phạm vi: <span className="font-bold text-slate-800">{studentCount ?? '—'}</span> học sinh
        </p>
      </div>
    </div>
  );
}

type Kpi = { label: string; value: string; icon: string; badge: string; color: string };

function KpiGrid({ items }: { items: Kpi[] }) {
  const cols = items.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  return (
    <div className={`mb-xl grid grid-cols-1 gap-gutter ${cols}`}>
      {items.map((k) => (
        <div
          key={k.label}
          className="group rounded-xl border border-slate-100 bg-white p-lg shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <MaterialSymbol name={k.icon} filled />
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-500">{k.badge}</span>
          </div>
          <p className="font-label-sm uppercase tracking-wider text-slate-500">{k.label}</p>
          <p className={`mt-1 text-[32px] font-bold ${k.color}`}>{k.value}</p>
        </div>
      ))}
    </div>
  );
}

type Quick = { to: string; label: string; icon: string; ring: string };

function QuickLinksGrid({ links }: { links: Quick[] }) {
  if (links.length === 0) return null;
  const lg =
    links.length >= 5 ? 'lg:grid-cols-5' : links.length === 4 ? 'lg:grid-cols-4' : links.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  return (
    <div className="mb-xl">
      <h3 className="font-h3 mb-md text-on-background">Thao tác nhanh</h3>
      <div className={`grid grid-cols-2 gap-md ${lg}`}>
        {links.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-primary-container hover:shadow-lg active:scale-95"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${q.ring} group-hover:bg-primary group-hover:text-white`}
            >
              <MaterialSymbol name={q.icon} className="text-3xl" />
            </div>
            <span className="text-center font-bold text-on-surface">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { accessToken, email, roles } = useAuth();
  const view = dashboardView(roles);
  const [data, setData] = useState<StaffSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getStaffDashboardSummary(accessToken);
        if (!cancelled) setData(s);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Không tải được dashboard.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!exportError) return;
    const t = window.setTimeout(() => setExportError(null), 6000);
    return () => window.clearTimeout(t);
  }, [exportError]);

  const onExportReport = useCallback(async () => {
    if (!accessToken) return;
    setExportError(null);
    setExporting(true);
    try {
      const blob = await getDashboardExportReport(accessToken);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadBlob(blob, `bao-cao-tong-quan-${stamp}.csv`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Xuất báo cáo thất bại.');
    } finally {
      setExporting(false);
    }
  }, [accessToken]);

  const displayName = email?.split('@')[0] ?? 'Quản trị';

  const monthLabels = useMemo(() => sixMonthLabelsUtc(), []);
  const enrollSeries = useMemo(() => {
    return data?.newStudentsLast6MonthsUtc?.length === 6 ? data.newStudentsLast6MonthsUtc : [0, 0, 0, 0, 0, 0];
  }, [data?.newStudentsLast6MonthsUtc]);
  const ageSlices = data?.studentAgeSlices?.length ? data.studentAgeSlices : [];
  const enrollPath = useMemo(() => buildEnrollmentLinePath(enrollSeries), [enrollSeries]);
  const enrollAreaPath = enrollPath ? `${enrollPath} L 1000,100 L 0,100 Z` : '';

  const leadershipQuickLinks = useMemo(
    () =>
      [
        {
          to: '/app/students',
          label: 'Thêm học sinh',
          icon: 'person_add',
          ring: 'bg-blue-50 text-primary',
          show: canStaffAccessStudentsNav(roles),
        },
        {
          to: '/app/attendance',
          label: 'Điểm danh hôm nay',
          icon: 'how_to_reg',
          ring: 'bg-emerald-50 text-emerald-600',
          show: canStaffAccessAttendanceNav(roles),
        },
        {
          to: '/app/announcements',
          label: 'Thông báo',
          icon: 'campaign',
          ring: 'bg-amber-50 text-amber-600',
          show: true,
        },
        {
          to: '/app/payments',
          label: 'Thanh toán',
          icon: 'payments',
          ring: 'bg-orange-50 text-secondary-container',
          show: roles.some((r) => r === 'KeToan' || r === 'BanGiamHieu' || r === 'SuperAdmin'),
        },
        {
          to: '/app/invoices',
          label: 'Hóa đơn / PDF',
          icon: 'receipt_long',
          ring: 'bg-sky-50 text-sky-700',
          show: roles.some((r) => r === 'KeToan' || r === 'BanGiamHieu' || r === 'SuperAdmin'),
        },
      ].filter((x) => x.show) as Quick[],
    [roles],
  );

  const teacherQuickLinks = useMemo(
    () =>
      [
        { to: '/app/attendance', label: 'Điểm danh', icon: 'fact_check', ring: 'bg-emerald-50 text-emerald-600' },
        { to: '/app/announcements', label: 'Thông báo lớp / trường', icon: 'campaign', ring: 'bg-amber-50 text-amber-600' },
      ] as Quick[],
    [],
  );

  const accountantQuickLinks = useMemo(
    () =>
      [
        { to: '/app/payments', label: 'Thanh toán', icon: 'payments', ring: 'bg-orange-50 text-secondary-container' },
        { to: '/app/invoices', label: 'Hóa đơn / PDF', icon: 'receipt_long', ring: 'bg-sky-50 text-sky-700' },
        { to: '/app/fee-structures', label: 'Biểu phí', icon: 'request_quote', ring: 'bg-violet-50 text-violet-700' },
        { to: '/app/fee-assignments', label: 'Gán phí', icon: 'assignment', ring: 'bg-indigo-50 text-indigo-700' },
        { to: '/app/announcements', label: 'Thông báo', icon: 'campaign', ring: 'bg-amber-50 text-amber-600' },
      ] as Quick[],
    [],
  );

  const chartsCommon = {
    monthLabels,
    enrollSeries,
    enrollPath,
    enrollAreaPath,
    ageSlices,
    studentCount: data?.studentCount,
  };

  if (view === 'teacher') {
    const kpis: Kpi[] = [
      {
        label: 'Học sinh (phạm vi của bạn)',
        value: data ? String(data.studentCount) : '—',
        icon: 'groups',
        badge: 'GVCN / lớp',
        color: 'text-secondary-container',
      },
      {
        label: 'Lớp chủ nhiệm',
        value: data ? String(data.classCount) : '—',
        icon: 'class',
        badge: 'Hiện tại',
        color: 'text-primary',
      },
      {
        label: 'Thông báo đã gửi (toàn trường)',
        value: data ? String(data.publishedAnnouncementsCount) : '—',
        icon: 'notifications_active',
        badge: 'Đã publish',
        color: 'text-primary',
      },
    ];

    return (
      <>
        <div className="mb-lg flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-h1 tracking-tight text-primary">Xin chào, {displayName}!</h2>
            <p className="font-body-lg text-body-lg text-slate-500">
              {loadError ? <span className="text-error">{loadError}</span> : 'Khu vực giáo viên — số liệu theo lớp bạn chủ nhiệm.'}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-3">
            {canStaffAccessStudentsNav(roles) ? (
              <Link
                to="/app/students"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white transition-all hover:bg-primary-container"
              >
                <MaterialSymbol name="person_search" className="text-lg" />
                Học sinh
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mb-md rounded-xl border border-sky-100 bg-sky-50/80 px-md py-sm text-sm text-sky-900">
          <strong>Gợi ý:</strong> Thu học phí, hóa đơn và cấu hình năm học do kế toán / ban giám hiệu phụ trách — bạn tập trung điểm danh và thông báo lớp.
        </div>

        <KpiGrid items={kpis} />
        <QuickLinksGrid links={teacherQuickLinks} />
        <DashboardChartsBlock
          {...chartsCommon}
          chartTitle="Học sinh mới theo tháng (UTC)"
          chartSubtitle="Trong phạm vi học sinh thuộc lớp bạn chủ nhiệm"
          ageSubtitle="Phạm vi học sinh của bạn (UTC)"
        />
      </>
    );
  }

  if (view === 'accountant') {
    const kpis: Kpi[] = [
      {
        label: 'Tổng thu tháng (UTC)',
        value: !data ? '—' : data.paymentsTotalThisMonthUtc == null ? '—' : money(data.paymentsTotalThisMonthUtc),
        icon: 'account_balance_wallet',
        badge: 'Tháng này',
        color: 'text-secondary-container',
      },
      {
        label: 'Tổng số học sinh (toàn trường)',
        value: data ? String(data.studentCount) : '—',
        icon: 'groups',
        badge: 'Hệ thống',
        color: 'text-primary',
      },
      {
        label: 'Số lớp',
        value: data ? String(data.classCount) : '—',
        icon: 'class',
        badge: 'Toàn trường',
        color: 'text-primary',
      },
      {
        label: 'Thông báo đã publish',
        value: data ? String(data.publishedAnnouncementsCount) : '—',
        icon: 'notifications_active',
        badge: 'Trường',
        color: 'text-primary',
      },
    ];

    return (
      <>
        <div className="mb-lg flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-h1 tracking-tight text-primary">Khu vực kế toán — {displayName}</h2>
            <p className="font-body-lg text-body-lg text-slate-500">
              {loadError ? <span className="text-error">{loadError}</span> : 'Thu chi, biểu phí và hóa đơn; tổng quan toàn trường.'}
            </p>
          </div>
        </div>

        <div className="mb-md rounded-xl border border-amber-100 bg-amber-50/90 px-md py-sm text-sm text-amber-950">
          Bạn không chỉnh sửa danh mục lớp / học sinh trên menu chính — dùng các mục <strong>Kế toán &amp; thu</strong> bên trái.
        </div>

        <KpiGrid items={kpis} />
        <QuickLinksGrid links={accountantQuickLinks} />
        <DashboardChartsBlock
          {...chartsCommon}
          chartTitle="Học sinh mới theo tháng (UTC)"
          chartSubtitle="Toàn trường — hỗ trợ theo dõi quy mô"
          ageTitle="Cơ cấu độ tuổi (toàn trường)"
          ageSubtitle="Ước tính từ ngày sinh (UTC)"
        />
      </>
    );
  }

  /* leadership: Ban giám hiệu + SuperAdmin */
  const leadershipKpis: Kpi[] = [
    {
      label: 'Tổng số học sinh',
      value: data ? String(data.studentCount) : '—',
      icon: 'groups',
      badge: 'Toàn trường',
      color: 'text-secondary-container',
    },
    {
      label: 'Số lớp học',
      value: data ? String(data.classCount) : '—',
      icon: 'class',
      badge: 'Toàn trường',
      color: 'text-primary',
    },
    {
      label: 'Tổng thu tháng (UTC)',
      value: !data ? '—' : data.paymentsTotalThisMonthUtc == null ? '—' : money(data.paymentsTotalThisMonthUtc),
      icon: 'account_balance_wallet',
      badge: data?.paymentsTotalThisMonthUtc == null ? '—' : 'Tháng này',
      color: 'text-secondary-container',
    },
    {
      label: 'Thông báo đã gửi',
      value: data ? String(data.publishedAnnouncementsCount) : '—',
      icon: 'notifications_active',
      badge: 'Đã publish',
      color: 'text-primary',
    },
  ];

  return (
    <>
      <div className="mb-lg flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-h1 tracking-tight text-primary">Điều hành — chào mừng, {displayName}!</h2>
          <p className="font-body-lg text-body-lg text-slate-500">
            {loadError ? <span className="text-error">{loadError}</span> : 'Tổng quan toàn trường và xuất báo cáo cho lãnh đạo.'}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-3">
          {canExportDashboardReport(roles) ? (
            <button
              type="button"
              disabled={exporting}
              onClick={() => void onExportReport()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-60"
            >
              <MaterialSymbol name="download" className="text-lg" />
              {exporting ? 'Đang xuất…' : 'Xuất báo cáo'}
            </button>
          ) : null}
          {canStaffAccessStudentsNav(roles) ? (
            <Link
              to="/app/students"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white transition-all hover:bg-primary-container"
            >
              <MaterialSymbol name="add" className="text-lg" />
              Thêm dữ liệu
            </Link>
          ) : null}
        </div>
      </div>

      {exportError ? (
        <div className="mb-md rounded-lg border border-error-container bg-error-container/20 px-3 py-2 text-sm text-error">{exportError}</div>
      ) : null}

      <KpiGrid items={leadershipKpis} />
      <QuickLinksGrid links={leadershipQuickLinks} />
      <DashboardChartsBlock
        {...chartsCommon}
        chartTitle="Học sinh mới theo tháng (UTC)"
        chartSubtitle="Đếm theo ngày tạo bản ghi học sinh (toàn trường)"
      />
    </>
  );
}
